import type { JwtService } from '@nestjs/jwt';
import type { ConfigService } from '../../config/config.service';
import { TokenService } from './token.service';
import { UnauthorizedError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

/**
 * Minimal in-memory stand-in for the PrismaService surface used by TokenService.
 * Tests stay DB-free and deterministic.
 */
function mockPrisma() {
  // Keyed by record id; findUnique still resolves by tokenHash via a scan.
  const store = new Map<string, { id: string; userId: string; tokenHash: string; expiresAt: Date; revokedAt: Date | null }>();
  let seq = 0;
  return {
    refreshToken: {
      create: jest.fn(async ({ data }: any) => {
        const id = `rt-${++seq}`;
        const rec = { id, ...data };
        store.set(id, rec);
        return rec;
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        return [...store.values()].find((r) => r.tokenHash === where.tokenHash) ?? null;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const rec = store.get(where.id);
        if (!rec) return null;
        Object.assign(rec, data);
        return rec;
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        let count = 0;
        for (const rec of store.values()) {
          if (rec.tokenHash === where.tokenHash && rec.revokedAt === null) {
            Object.assign(rec, data);
            count++;
          }
        }
        return { count };
      }),
      deleteMany: jest.fn(async () => ({ count: 0 })),
    },
    user: {
      findUniqueOrThrow: jest.fn(async ({ where }: any) => ({ id: where.id, email: 'u@x.dev', status: 'ACTIVE' })),
    },
  };
}

function mockConfig() {
  return { value: { JWT_ACCESS_SECRET: 'a'.repeat(32), JWT_ACCESS_TTL: 900, JWT_REFRESH_TTL: 3600 } } as unknown as ConfigService;
}

describe('TokenService', () => {
  let jwt: JwtService;
  let prisma: ReturnType<typeof mockPrisma>;
  let service: TokenService;

  beforeEach(() => {
    jwt = { signAsync: jest.fn().mockResolvedValue('access-token') } as unknown as JwtService;
    prisma = mockPrisma();
    service = new TokenService(jwt, prisma as any, mockConfig());
  });

  describe('issueTokenPair', () => {
    it('issues an access JWT plus an opaque refresh token stored hashed', async () => {
      const pair = await service.issueTokenPair({ id: 'u1', email: 'u@x.dev' });
      expect(pair.accessToken).toBe('access-token');
      expect(pair.refreshToken).toMatch(/.{16,}/);
      expect(pair.expiresIn).toBe(900);
      expect(prisma.refreshToken.create).toHaveBeenCalledTimes(1);
      // Stored hash must NOT equal the raw token.
      const stored = (prisma.refreshToken.create as jest.Mock).mock.calls[0][0].data.tokenHash;
      expect(stored).not.toBe(pair.refreshToken);
      expect(stored.length).toBeGreaterThan(0);
    });
  });

  describe('rotateRefreshToken', () => {
    it('revokes the consumed token and returns a fresh pair', async () => {
      const pair = await service.issueTokenPair({ id: 'u1', email: 'u@x.dev' });
      const rotated = await service.rotateRefreshToken(pair.refreshToken);
      expect(rotated.accessToken).toBe('access-token');
      expect(rotated.refreshToken).not.toBe(pair.refreshToken);
      expect(prisma.refreshToken.update).toHaveBeenCalled();
    });

    it('rejects reuse of an already-rotated token', async () => {
      const pair = await service.issueTokenPair({ id: 'u1', email: 'u@x.dev' });
      await service.rotateRefreshToken(pair.refreshToken); // first use
      await expect(service.rotateRefreshToken(pair.refreshToken)).rejects.toThrow(UnauthorizedError);
      await expect(service.rotateRefreshToken(pair.refreshToken)).rejects.toMatchObject({
        code: ErrorCodes.REFRESH_TOKEN_REUSE,
      });
    });

    it('rejects an unknown refresh token', async () => {
      await expect(service.rotateRefreshToken('totally-bogus')).rejects.toThrow(UnauthorizedError);
    });

    it('rejects an expired refresh token', async () => {
      const pair = await service.issueTokenPair({ id: 'u1', email: 'u@x.dev' });
      // Force expiry on the stored record.
      const stored = (prisma.refreshToken.create as jest.Mock).mock.calls[0][0].data.tokenHash;
      const record: any = await prisma.refreshToken.findUnique({ where: { tokenHash: stored } });
      record.expiresAt = new Date(Date.now() - 1000);
      await expect(service.rotateRefreshToken(pair.refreshToken)).rejects.toMatchObject({
        code: ErrorCodes.TOKEN_EXPIRED,
      });
    });
  });

  describe('revokeRefreshToken', () => {
    it('marks the matching active token revoked', async () => {
      const pair = await service.issueTokenPair({ id: 'u1', email: 'u@x.dev' });
      await service.revokeRefreshToken(pair.refreshToken);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalled();
    });
  });
});
