import { RbacService } from './rbac.service';

function mockRedis() {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue(['0', []]),
  } as any;
}

function mockPrisma() {
  return {
    membership: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  } as any;
}

describe('RbacService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let redis: ReturnType<typeof mockRedis>;
  let service: RbacService;

  beforeEach(() => {
    prisma = mockPrisma();
    redis = mockRedis();
    service = new RbacService(prisma, redis);
  });

  it('loads permissions from DB and writes them to the cache', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      role: { permissions: [{ permission: { key: 'clients:read' } }, { permission: { key: 'invoices:write' } }] },
    });
    const perms = await service.getPermissions('u1', 'o1');
    expect(perms.has('clients:read')).toBe(true);
    expect(perms.has('invoices:write')).toBe(true);
    expect(redis.set).toHaveBeenCalledWith(
      'rbac:o1:u1',
      expect.any(String),
      'EX',
      60,
    );
  });

  it('serves from cache without touching the DB', async () => {
    redis.get.mockResolvedValue(JSON.stringify(['clients:read']));
    const perms = await service.getPermissions('u1', 'o1');
    expect(perms.has('clients:read')).toBe(true);
    expect(prisma.membership.findUnique).not.toHaveBeenCalled();
  });

  it('returns an empty set when the user has no membership', async () => {
    const perms = await service.getPermissions('u1', 'o1');
    expect(perms.size).toBe(0);
    expect(redis.set).toHaveBeenCalled();
  });

  it('hasPermission reflects the resolved set', async () => {
    prisma.membership.findUnique.mockResolvedValue({
      role: { permissions: [{ permission: { key: 'clients:read' } }] },
    });
    await expect(service.hasPermission('u1', 'o1', 'clients:read')).resolves.toBe(true);
    await expect(service.hasPermission('u1', 'o1', 'clients:delete')).resolves.toBe(false);
  });

  it('invalidate deletes the cache key', async () => {
    await service.invalidate('u1', 'o1');
    expect(redis.del).toHaveBeenCalledWith('rbac:o1:u1');
  });
});
