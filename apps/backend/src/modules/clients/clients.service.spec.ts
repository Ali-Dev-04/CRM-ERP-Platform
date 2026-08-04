import { ClientsService } from './clients.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { PaginationDto } from '../../common/pagination/pagination.dto';

function mockOrgs() {
  return { assertWorkspaceInOrg: jest.fn().mockResolvedValue(undefined) } as any;
}
function mockAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) } as any;
}
function mockPrisma() {
  return {
    client: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(async (args: unknown[]) => Promise.all(args)),
  } as any;
}

describe('ClientsService', () => {
  let prisma: ReturnType<typeof mockPrisma>;
  let service: ClientsService;

  beforeEach(() => {
    prisma = mockPrisma();
    service = new ClientsService(prisma, mockOrgs(), mockAudit());
  });

  const baseClient = {
    id: 'c1',
    workspaceId: 'w1',
    name: 'Acme',
    email: null,
    phone: null,
    company: null,
    address: null,
    notes: null,
    status: 'ACTIVE',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('creates a client within the workspace and records an audit entry', async () => {
    prisma.client.create.mockResolvedValue(baseClient);
    const view = await service.create('u1', 'o1', 'w1', { name: 'Acme' });
    expect(view.id).toBe('c1');
    expect(prisma.client.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: 'Acme', workspaceId: 'w1', createdById: 'u1' }),
    });
  });

  it('returns a paginated list scoped to the workspace', async () => {
    prisma.$transaction.mockResolvedValue([[baseClient], 1]);
    const pagination = Object.assign(new PaginationDto(), { page: 1, size: 25 });
    const result = await service.list('o1', 'w1', pagination);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.totalPages).toBe(1);
  });

  it('throws NotFound when the client does not exist in the workspace', async () => {
    prisma.client.findFirst.mockResolvedValue(null);
    await expect(service.get('o1', 'w1', 'missing')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('soft-deletes by setting deletedAt', async () => {
    prisma.client.findFirst.mockResolvedValue(baseClient);
    prisma.client.update.mockResolvedValue({ ...baseClient, deletedAt: new Date() });
    const res = await service.remove('u1', 'o1', 'w1', 'c1');
    expect(res).toEqual({ deleted: true });
    expect(prisma.client.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1' }, data: expect.objectContaining({ deletedAt: expect.any(Date) }) }),
    );
  });
});
