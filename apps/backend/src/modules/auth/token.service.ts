import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ConfigService } from '../../config/config.service';
import { UnauthorizedError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** Access-token lifetime in seconds, for client UX. */
  expiresIn: number;
}

interface RequestContext {
  ip?: string;
  userAgent?: string;
}

/**
 * Access + refresh token issuance, verification, and rotation.
 *
 * Access tokens: short-lived JWT (stateless, validated by signature only).
 * Refresh tokens: opaque random tokens, hashed at rest, single-use with
 *   rotation — reuse of a rotated token is detected and rejected, signalling
 *   possible theft (the whole family should be revoked in a fuller impl).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async issueTokenPair(
    user: { id: string; email: string },
    ctx: RequestContext = {},
  ): Promise<TokenPair> {
    const expiresIn = this.config.value.JWT_ACCESS_TTL;
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, email: user.email },
      {
        secret: this.config.value.JWT_ACCESS_SECRET,
        expiresIn,
      },
    );
    const refreshToken = await this.createRefreshToken(user.id, ctx);
    return { accessToken, refreshToken, expiresIn };
  }

  async verifyAccessToken(token: string): Promise<{ sub: string; email: string }> {
    try {
      return await this.jwt.verifyAsync(token, {
        secret: this.config.value.JWT_ACCESS_SECRET,
      });
    } catch {
      throw new UnauthorizedError(ErrorCodes.TOKEN_INVALID, 'Invalid or expired token');
    }
  }

  /**
   * Single-use rotation. On success the consumed token is revoked and a fresh
   * pair is issued. If the presented token was already revoked, we treat it as
   * a reuse attack and revoke it again (defence in depth).
   */
  async rotateRefreshToken(rawToken: string, ctx: RequestContext = {}): Promise<TokenPair> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
    });
    if (!record) {
      throw new UnauthorizedError(ErrorCodes.TOKEN_INVALID, 'Invalid refresh token');
    }
    const now = new Date();
    if (record.revokedAt) {
      // Reuse of a rotated token — reject. (Future: revoke all user tokens.)
      throw new UnauthorizedError(ErrorCodes.REFRESH_TOKEN_REUSE, 'Refresh token reuse detected');
    }
    if (record.expiresAt < now) {
      throw new UnauthorizedError(ErrorCodes.TOKEN_EXPIRED, 'Refresh token expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: now },
    });

    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: record.userId },
      select: { id: true, email: true, status: true },
    });
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError(ErrorCodes.USER_DISABLED, 'Account is not active');
    }
    return this.issueTokenPair({ id: user.id, email: user.email }, ctx);
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Prune expired/revoked tokens. Schedule via BullMQ later. */
  async pruneExpired(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
    return result.count;
  }

  private async createRefreshToken(userId: string, ctx: RequestContext): Promise<string> {
    const raw = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(raw),
        expiresAt: new Date(Date.now() + this.config.value.JWT_REFRESH_TTL * 1000),
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });
    return raw;
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }
}
