import { AssetsService } from './assets.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';

const mockOrgs = { assertWorkspaceInOrg: jest.fn().mockResolvedValue(undefined) } as any;
const mockEmployees = { load: jest.fn() } as any;
const mockAudit = { record: jest.fn().mockResolvedValue(undefined) } as any;

describe('AssetsService', () => {
  let prisma: any;
  let service: AssetsService;

  beforeEach(() => {
    prisma = {
      asset: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    };
    service = new AssetsService(prisma, mockOrgs, mockEmployees, mockAudit);
  });

  it('assigns an asset to an existing employee and sets status ASSIGNED', async () => {
    prisma.asset.findFirst.mockResolvedValue({ id: 'a1', workspaceId: 'w' });
    mockEmployees.load.mockResolvedValue(undefined);
    prisma.asset.update.mockResolvedValue({ id: 'a1', assignedToEmployeeId: 'e1', status: 'ASSIGNED' });
    const res = await service.assign('u', 'o', 'w', 'a1', { employeeId: 'e1' });
    expect(prisma.asset.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ assignedToEmployeeId: 'e1', status: 'ASSIGNED' }) }),
    );
    expect(res.status).toBe('ASSIGNED');
  });

  it('unassigns when employeeId is null and sets status AVAILABLE', async () => {
    prisma.asset.findFirst.mockResolvedValue({ id: 'a1', workspaceId: 'w' });
    prisma.asset.update.mockResolvedValue({ id: 'a1', assignedToEmployeeId: null, status: 'AVAILABLE' });
    const res = await service.assign('u', 'o', 'w', 'a1', { employeeId: null });
    expect(res.status).toBe('AVAILABLE');
  });

  it('fails to assign when the employee does not exist', async () => {
    prisma.asset.findFirst.mockResolvedValue({ id: 'a1', workspaceId: 'w' });
    mockEmployees.load.mockRejectedValue(new NotFoundError('common.not_found', 'Employee not found'));
    await expect(service.assign('u', 'o', 'w', 'a1', { employeeId: 'ghost' })).rejects.toBeInstanceOf(NotFoundError);
  });
});
