import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.module';

const CACHE_TTL_SECONDS = 60;

/**
 * Resolves a user's effective permission set within an organization.
 * Effective set = union of permissions on the role attached to the user's
 * membership in that org. Cached briefly in Redis; invalidated on
 * membership/role changes (call `invalidate` from the service that mutates).
 *
 * Redis is treated as a SOFT dependency: if it is unreachable, reads fall back
 * to the database (the source of truth) and writes are skipped. This keeps the
 * app running when Redis is down or absent (e.g. local dev without Redis).
 */
@Injectable()
export class RbacService {
  private readonly logger = new Logger(RbacService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async getPermissions(userId: string, organizationId: string): Promise<Set<string>> {
    const cacheKey = this.key(userId, organizationId);
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) return new Set<string>(JSON.parse(cached) as string[]);
    } catch (err) {
      this.logger.warn(`Redis cache read failed, using DB: ${(err as Error).message}`);
    }
    const perms = await this.loadFromDb(userId, organizationId);
    try {
      await this.redis.set(cacheKey, JSON.stringify([...perms]), 'EX', CACHE_TTL_SECONDS);
    } catch {
      // cache write is best-effort
    }
    return perms;
  }

  async hasPermission(userId: string, organizationId: string, permission: string): Promise<boolean> {
    return (await this.getPermissions(userId, organizationId)).has(permission);
  }

  async invalidate(userId: string, organizationId: string): Promise<void> {
    try {
      await this.redis.del(this.key(userId, organizationId));
    } catch {
      // best-effort
    }
  }

  async invalidateOrganization(organizationId: string): Promise<void> {
    // Memberships changed org-wide; clear all user caches for this org.
    try {
      let cursor = '0';
      do {
        const [next, keys] = await this.redis.scan(
          cursor,
          'MATCH',
          `rbac:${organizationId}:*`,
          'COUNT',
          200,
        );
        cursor = next;
        if (keys.length) await this.redis.del(...keys);
      } while (cursor !== '0');
    } catch {
      // best-effort
    }
  }

  private async loadFromDb(userId: string, organizationId: string): Promise<Set<string>> {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    if (!membership) return new Set<string>();
    return new Set(membership.role.permissions.map((rp) => rp.permission.key));
  }

  private key(userId: string, organizationId: string): string {
    return `rbac:${organizationId}:${userId}`;
  }
}
