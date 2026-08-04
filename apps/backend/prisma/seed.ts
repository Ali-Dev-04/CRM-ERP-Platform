/* eslint-disable no-console */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { PERMISSIONS, SYSTEM_ROLES } from '../src/modules/rbac/permissions';

const prisma = new PrismaClient();

/**
 * Local-dev seed: (1) ensures the RBAC catalog exists (same logic as the app
 * bootstrap, so this is safe to run first), (2) creates a demo organization
 * + Owner user for manual testing.
 *
 *   email: demo@crm.dev   password: DemoPass12345
 */
async function main(): Promise<void> {
  // 1) RBAC catalog (idempotent)
  const perms: Record<string, { id: string }> = {};
  for (const key of PERMISSIONS) {
    perms[key] = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key },
    });
  }
  for (const def of Object.values(SYSTEM_ROLES)) {
    let role = await prisma.role.findFirst({
      where: { name: def.name, organizationId: null, isSystem: true },
    });
    if (!role) {
      role = await prisma.role.create({
        data: { name: def.name, organizationId: null, isSystem: true },
      });
    }
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: def.permissions.map((k) => ({ roleId: role.id, permissionId: perms[k]!.id })),
      skipDuplicates: true,
    });
  }

  // 2) Demo tenant
  const email = 'demo@crm.dev';
  const passwordHash = await argon2.hash('DemoPass12345', { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, firstName: 'Ada', lastName: 'Lovelace' },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'acme-inc' },
    update: { ownerId: user.id },
    create: { name: 'Acme Inc', slug: 'acme-inc', ownerId: user.id },
  });

  const ownerRole = await prisma.role.findFirstOrThrow({
    where: { name: 'Owner', organizationId: null, isSystem: true },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, roleId: ownerRole.id },
  });

  await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'default' } },
    update: {},
    create: { organizationId: org.id, name: 'Default', slug: 'default' },
  });

  console.log(`Seed complete — login: ${email} / DemoPass12345  (org: ${org.slug})`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
