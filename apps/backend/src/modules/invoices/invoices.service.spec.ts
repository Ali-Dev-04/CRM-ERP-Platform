import { InvoicesService } from './invoices.service';
import { ValidationError } from '../../common/exceptions/domain.exception';

function mockOrgs() {
  return { assertWorkspaceInOrg: jest.fn().mockResolvedValue(undefined) } as any;
}
function mockAudit() {
  return { record: jest.fn().mockResolvedValue(undefined) } as any;
}

describe('InvoicesService', () => {
  let prisma: any;
  let service: InvoicesService;

  beforeEach(() => {
    prisma = {
      invoice: {
        count: jest.fn().mockResolvedValue(0),
        findFirst: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    };
    service = new InvoicesService(prisma, mockOrgs(), mockAudit());
  });

  describe('isValidTransition (via setStatus)', () => {
    it('allows DRAFT → SENT and performs the update', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'i1', status: 'DRAFT', workspaceId: 'w' });
      prisma.invoice.update.mockResolvedValue({ id: 'i1', status: 'SENT' });
      const res = await service.setStatus('u', 'o', 'w', 'i1', { status: 'SENT' });
      expect(prisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'i1' } }));
      expect(res.status).toBe('SENT');
    });

    it('rejects an invalid transition (DRAFT → PAID)', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'i1', status: 'DRAFT', workspaceId: 'w' });
      await expect(service.setStatus('u', 'o', 'w', 'i1', { status: 'PAID' as any })).rejects.toBeInstanceOf(
        ValidationError,
      );
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });

    it('forbids transitions out of a terminal status (PAID)', async () => {
      prisma.invoice.findFirst.mockResolvedValue({ id: 'i1', status: 'PAID', workspaceId: 'w' });
      await expect(service.setStatus('u', 'o', 'w', 'i1', { status: 'SENT' as any })).rejects.toBeInstanceOf(
        ValidationError,
      );
    });
  });

  describe('recalcPaidStatus', () => {
    it('marks the invoice PAID when completed payments cover the total', async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        id: 'i1', status: 'SENT', totalCents: 1000n,
        payments: [{ amountCents: 1000n }],
      });
      const status = await service.recalcPaidStatus('i1');
      expect(status).toBe('PAID');
      expect(prisma.invoice.update).toHaveBeenCalledWith({ where: { id: 'i1' }, data: { status: 'PAID' } });
    });

    it('marks PARTIALLY_PAID when some (not all) is paid', async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        id: 'i1', status: 'SENT', totalCents: 1000n,
        payments: [{ amountCents: 400n }],
      });
      expect(await service.recalcPaidStatus('i1')).toBe('PARTIALLY_PAID');
    });

    it('leaves a DRAFT invoice untouched', async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({ id: 'i1', status: 'DRAFT', totalCents: 0n, payments: [] });
      expect(await service.recalcPaidStatus('i1')).toBe('DRAFT');
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });
});
