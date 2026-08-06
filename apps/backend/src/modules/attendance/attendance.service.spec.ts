import { AttendanceService } from './attendance.service';
import { NotFoundError, ConflictError } from '../../common/exceptions/domain.exception';

const mockEmployees = { load: jest.fn().mockResolvedValue(undefined) } as any;
const mockAudit = { record: jest.fn().mockResolvedValue(undefined) } as any;

describe('AttendanceService', () => {
  let prisma: any;
  let service: AttendanceService;

  beforeEach(() => {
    prisma = {
      attendance: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    };
    mockEmployees.load.mockResolvedValue(undefined);
    service = new AttendanceService(prisma, mockEmployees, mockAudit);
  });

  it('clock-out fails when there is no clock-in record for today', async () => {
    prisma.attendance.findUnique.mockResolvedValue(null);
    await expect(service.clockOut('u', 'o', 'w', 'e1')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('clock-out fails when already clocked out', async () => {
    prisma.attendance.findUnique.mockResolvedValue({ id: 'a1', clockIn: new Date(), clockOut: new Date() });
    await expect(service.clockOut('u', 'o', 'w', 'e1')).rejects.toBeInstanceOf(ConflictError);
  });

  it('clock-out computes work minutes when a valid open record exists', async () => {
    const earlier = new Date(Date.now() - 60 * 60 * 1000); // 1h ago
    prisma.attendance.findUnique.mockResolvedValue({ id: 'a1', clockIn: earlier, clockOut: null });
    prisma.attendance.update.mockResolvedValue({ id: 'a1', clockOut: new Date(), workMinutes: 60 });
    const res = await service.clockOut('u', 'o', 'w', 'e1');
    expect(prisma.attendance.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' }, data: expect.objectContaining({ workMinutes: expect.any(Number) }) }),
    );
    expect(res.workMinutes).toBeGreaterThanOrEqual(59);
  });
});
