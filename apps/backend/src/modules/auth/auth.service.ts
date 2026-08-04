import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { TokenService, type TokenPair } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConflictError, UnauthorizedError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { claimOrgSlug } from '../../common/utils/claim-slug';
import { toUserView } from '../users/user.view';
import type { Request } from 'express';

export interface AuthResponse extends TokenPair {
  user: ReturnType<typeof toUserView>;
}

type Ctx = { ip?: string; userAgent?: string };

function ctxFrom(req: Request): Ctx {
  return { ip: req.ip, userAgent: req.get('user-agent') };
}

/**
 * Authentication use-cases. Signup bootstraps a new tenant: it creates the
 * user, their organization, a default workspace, and an Owner membership in a
 * single transaction. Login/refresh/logout are token-driven (see TokenService).
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async register(dto: RegisterDto, req: Request): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictError(ErrorCodes.EMAIL_ALREADY_USED, 'Email is already registered');
    }

    const slug = await claimOrgSlug(this.prisma, dto.organizationName);
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19_456,
      timeCost: 2,
      parallelism: 1,
    });
    const ownerRole = await this.findSystemOwnerRole();

    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
        },
      });
      const org = await tx.organization.create({
        data: { name: dto.organizationName, slug, ownerId: user.id },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: org.id, roleId: ownerRole.id },
      });
      await tx.workspace.create({
        data: { organizationId: org.id, name: 'Default', slug: 'default' },
      });
      return { user, org };
    });

    const ctx = ctxFrom(req);
    const pair = await this.tokens.issueTokenPair(
      { id: created.user.id, email: created.user.email },
      ctx,
    );

    this.audit
      .record({
        actorId: created.user.id,
        organizationId: created.org.id,
        action: 'user.register',
        targetType: 'user',
        targetId: created.user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
      .catch(() => undefined);

    return { ...pair, user: toUserView(created.user) };
  }

  async login(dto: LoginDto, req: Request): Promise<AuthResponse> {
    // Generic error to avoid user enumeration — same code/message for
    // unknown-user and wrong-password.
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const passwordOk = user
      ? await argon2.verify(user.passwordHash, dto.password).catch(() => false)
      : false;

    if (!user || !passwordOk || user.deletedAt) {
      throw new UnauthorizedError(ErrorCodes.INVALID_CREDENTIALS, 'Invalid email or password');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedError(ErrorCodes.USER_DISABLED, 'Account is not active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const ctx = ctxFrom(req);
    const pair = await this.tokens.issueTokenPair(
      { id: user.id, email: user.email },
      ctx,
    );

    const membership = await this.prisma.membership.findFirst({
      where: { userId: user.id },
    });
    this.audit
      .record({
        actorId: user.id,
        organizationId: membership?.organizationId,
        action: 'user.login',
        targetType: 'user',
        targetId: user.id,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      })
      .catch(() => undefined);

    return { ...pair, user: toUserView(user) };
  }

  async refresh(refreshToken: string, req: Request): Promise<TokenPair> {
    return this.tokens.rotateRefreshToken(refreshToken, ctxFrom(req));
  }

  async logout(refreshToken: string): Promise<{ revoked: true }> {
    await this.tokens.revokeRefreshToken(refreshToken);
    return { revoked: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    return toUserView(user);
  }

  private async findSystemOwnerRole() {
    const role = await this.prisma.role.findFirst({
      where: { name: 'Owner', organizationId: null, isSystem: true },
    });
    if (!role) {
      throw new Error('System Owner role missing — RBAC bootstrap did not run');
    }
    return role;
  }
}
