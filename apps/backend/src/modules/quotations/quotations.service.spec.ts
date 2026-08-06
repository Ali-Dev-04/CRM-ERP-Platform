import { QuotationsService } from './quotations.service';
import { ConflictError, NotFoundError } from '../../common/exceptions/domain.exception';

const mockOrgs = { assertWorkspaceInOrg: jest.fn().mockResolvedValue(undefined) } as any;
const mockAudit = { record: jest.fn().mockResolvedValue(undefined) } as any;
const mockInvoices = { create: jest.fn() } as any;

describe('QuotationsService — convert', () => {
  let prisma: any;
  let service: QuotationsService;

  beforeEach(() => {
    prisma = {
      quotation: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn(), count: jest.fn() },
    };
    service = new QuotationsService(prisma, mockOrgs, mockInvoices, mockAudit);
  });

  it('refuses to convert a quotation that is already converted', async () => {
    prisma.quotation.findFirst.mockResolvedValue({
      id: 'q1', status: 'CONVERTED', workspaceId: 'w', clientId: 'c1',
      currency: 'USD', discountCents: 0n, taxCents: 0n, notes: null, lines: [],
    });
    await expect(service.setStatus('u', 'o', 'w', 'q1', { status: 'CONVERTED' } as any)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it('converts a quotation into a draft invoice and marks it CONVERTED', async () => {
    prisma.quotation.findFirst.mockResolvedValue({
      id: 'q1', status: 'SENT', workspaceId: 'w', clientId: 'c1',
      currency: 'USD', discountCents: 0n, taxCents: 0n, notes: null,
      lines: [{ description: 'x', quantity: { toString: () => '1' }, unitPriceCents: 1000n, position: 0 }],
    });
    mockInvoices.create.mockResolvedValue({ id: 'inv1' });
    prisma.quotation.update.mockResolvedValue({ id: 'q1', status: 'CONVERTED', convertedInvoiceId: 'inv1' });

    const res = await service.setStatus('u', 'o', 'w', 'q1', { status: 'CONVERTED' } as any);

    expect(mockInvoices.create).toHaveBeenCalled();
    expect(prisma.quotation.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'CONVERTED', convertedInvoiceId: 'inv1' }) }),
    );
    expect(res.convertedInvoiceId).toBe('inv1');
  });

  it('returns NotFound when the quotation is missing', async () => {
    prisma.quotation.findFirst.mockResolvedValue(null);
    await expect(service.setStatus('u', 'o', 'w', 'missing', { status: 'ACCEPTED' } as any)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
