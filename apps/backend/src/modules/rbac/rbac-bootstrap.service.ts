import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PERMISSIONS, SYSTEM_ROLES } from './permissions';

/**
 * Self-healing RBAC seed. Runs on every boot and is idempotent: it guarantees
 * the permission catalog and system roles exist and are correctly linked, so
 * the app works even if `npm run db:seed` was skipped. Safe because it runs
 * once at startup before serving traffic.
 */
@Injectable()
export class RbacBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RbacBootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.ensure();
      this.logger.log('RBAC catalog verified');
    } catch (err) {
      this.logger.error(`RBAC bootstrap failed: ${(err as Error).message}`);
      throw err;
    }
  }

  async ensure(): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const perms: Record<string, { id: string }> = {};
      for (const key of PERMISSIONS) {
        perms[key] = await tx.permission.upsert({
          where: { key },
          update: {},
          create: { key },
        });
      }

      for (const def of Object.values(SYSTEM_ROLES)) {
        let role = await tx.role.findFirst({
          where: { name: def.name, organizationId: null, isSystem: true },
        });
        if (!role) {
          role = await tx.role.create({
            data: { name: def.name, organizationId: null, isSystem: true },
          });
        }
        // Resync role→permission links to match the catalog exactly.
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        await tx.rolePermission.createMany({
          data: def.permissions.map((key) => ({
            roleId: role.id,
            permissionId: perms[key]!.id,
          })),
          skipDuplicates: true,
        });
      }
    });
  }
}
