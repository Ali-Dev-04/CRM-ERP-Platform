import { LeavesService } from './leaves.service';
import { NotFoundError, ValidationError } from '../../common/exceptions/domain.exception';

const mockEmployees = { load: jest.fn().mockResolvedValue(undefined) } as any;
const mockAudit = { record: jest.fn().mockResolvedValue(undefined) } as any;

describe('LeavesService', () => {
  let prisma: any;
  let service: LeavesService;

  beforeEach(() => {
    prisma = { leave: { create: jest.fn(), findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() } };
    mockEmployees.load.mockResolvedValue(undefined);
    service = new LeavesService(prisma, mockEmployees, mockAudit);
  });

  it('rejects a leave request where the end date precedes the start', async () => {
    await expect(
      service.request('u', 'o', 'w', 'e1', { type: 'ANNUAL', startDate: '2026-02-10', endDate: '2026-02-01' } as any),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.leave.create).not.toHaveBeenCalled();
  });

  it('creates a pending leave for a valid range', async () => {
    prisma.leave.create.mockResolvedValue({ id: 'l1', status: 'PENDING' });
    const res = await service.request('u', 'o', 'w', 'e1', { type: 'SICK', startDate: '2026-02-01', endDate: '2026-02-03' } as any);
    expect(res.status).toBe('PENDING');
    expect(prisma.leave.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PENDING' }) }));
  });

  it('refuses to review a leave that is not pending', async () => {
    prisma.leave.findUnique.mockResolvedValue({ id: 'l1', status: 'APPROVED', employeeId: 'e1', employee: { workspaceId: 'w' } });
    await expect(service.review('u', 'o', 'w', 'l1', { status: 'APPROVED' })).rejects.toBeInstanceOf(ValidationError);
  });

  it('returns NotFound when reviewing a leave outside the workspace', async () => {
    prisma.leave.findUnique.mockResolvedValue({ id: 'l1', status: 'PENDING', employeeId: 'e1', employee: { workspaceId: 'OTHER' } });
    await expect(service.review('u', 'o', 'w', 'l1', { status: 'APPROVED' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
