import { Injectable } from '@nestjs/common';
import { Prisma, type Invoice, type InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError, ConflictError, ValidationError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { computeTotals } from '../../common/utils/money';
import { CreateInvoiceDto, UpdateInvoiceStatusDto } from './dto/invoice.dto';

const NUMBER_PREFIX = 'INV';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    dto: CreateInvoiceDto,
  ): Promise<Invoice> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    await this.assertClientInWorkspace(workspaceId, dto.clientId);
    if (dto.lines.length === 0) {
      throw new ValidationError(ErrorCodes.VALIDATION, 'An invoice must have at least one line');
    }

    const discount = BigInt(dto.discountCents ?? 0);
    const tax = BigInt(dto.taxCents ?? 0);
    const totals = computeTotals(dto.lines, discount, tax);
    const year = new Date().getFullYear();

    // Create with a workspace-sequential number; the unique constraint is the
    // backstop against concurrent numbering — retry on collision.
    return this.withNumberRetry(async (seq) => {
      const invoice = await this.prisma.invoice.create({
        data: {
          workspaceId,
          clientId: dto.clientId,
          number: `${NUMBER_PREFIX}-${year}-${String(seq).padStart(5, '0')}`,
          status: 'DRAFT',
          dueDate: new Date(dto.dueDate),
          subtotalCents: totals.subtotalCents,
          discountCents: discount,
          taxCents: tax,
          totalCents: totals.totalCents,
          currency: dto.currency ?? 'USD',
          notes: dto.notes,
          lines: {
            create: dto.lines.map((l, i) => ({
              description: l.description,
              quantity: new Prisma.Decimal(l.quantity),
              unitPriceCents: BigInt(l.unitPriceCents),
              totalCents: computeTotals([l], 0n, 0n).subtotalCents,
              position: l.position ?? i,
            })),
          },
        },
        include: { lines: { orderBy: { position: 'asc' } } },
      });
      this.audit
        .record({
          actorId,
          organizationId,
          action: 'invoice.create',
          targetType: 'invoice',
          targetId: invoice.id,
          metadata: { number: invoice.number, totalCents: invoice.totalCents.toString() },
        })
        .catch(() => undefined);
      return invoice;
    }, workspaceId);
  }

  async list(
    organizationId: string,
    workspaceId: string,
    pagination: PaginationDto,
    status?: InvoiceStatus,
  ): Promise<Paginated<Invoice>> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const where = { workspaceId, ...(status ? { status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.size,
        include: { lines: { orderBy: { position: 'asc' } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }

  async get(organizationId: string, workspaceId: string, invoiceId: string): Promise<Invoice> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, workspaceId },
      include: { lines: { orderBy: { position: 'asc' } }, payments: true },
    });
    if (!invoice) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Invoice not found');
    return invoice;
  }

  async setStatus(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    invoiceId: string,
    dto: UpdateInvoiceStatusDto,
  ): Promise<Invoice> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, workspaceId } });
    if (!invoice) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Invoice not found');
    if (!this.isValidTransition(invoice.status, dto.status)) {
      throw new ValidationError(
        ErrorCodes.VALIDATION,
        `Cannot transition invoice from ${invoice.status} to ${dto.status}`,
      );
    }
    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: dto.status },
    });
    this.audit
      .record({
        actorId,
        organizationId,
        action: 'invoice.status_change',
        targetType: 'invoice',
        targetId: invoiceId,
        metadata: { from: invoice.status, to: dto.status },
      })
      .catch(() => undefined);
    return updated;
  }

  async remove(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    invoiceId: string,
  ): Promise<{ deleted: true }> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const invoice = await this.prisma.invoice.findFirst({ where: { id: invoiceId, workspaceId } });
    if (!invoice) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Invoice not found');
    if (invoice.status !== 'DRAFT') {
      throw new ConflictError(ErrorCodes.CONFLICT, 'Only draft invoices can be deleted');
    }
    await this.prisma.invoice.delete({ where: { id: invoiceId } });
    this.audit
      .record({ actorId, organizationId, action: 'invoice.delete', targetType: 'invoice', targetId: invoiceId })
      .catch(() => undefined);
    return { deleted: true };
  }

  /** Recompute invoice status from completed payments; called by PaymentsService. */
  async recalcPaidStatus(invoiceId: string): Promise<InvoiceStatus> {
    const invoice = await this.prisma.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { payments: { where: { status: 'COMPLETED' } } },
    });
    const paid = invoice.payments.reduce((s, p) => s + p.amountCents, 0n);
    let status: InvoiceStatus = invoice.status;
    if (invoice.status === 'DRAFT') return status;
    if (paid >= invoice.totalCents) status = 'PAID';
    else if (paid > 0n) status = 'PARTIALLY_PAID';
    else if (invoice.status === 'PARTIALLY_PAID' || invoice.status === 'PAID') status = 'SENT';
    if (status !== invoice.status) {
      await this.prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
    }
    return status;
  }

  private isValidTransition(from: InvoiceStatus, to: InvoiceStatus): boolean {
    const allowed: Record<string, InvoiceStatus[]> = {
      DRAFT: ['SENT', 'CANCELLED'],
      SENT: ['PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED'],
      PARTIALLY_PAID: ['PAID', 'OVERDUE', 'CANCELLED'],
      PAID: [],
      OVERDUE: ['PARTIALLY_PAID', 'PAID', 'CANCELLED'],
      CANCELLED: [],
    };
    return (allowed[from] ?? []).includes(to);
  }

  private async assertClientInWorkspace(workspaceId: string, clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workspaceId, deletedAt: null },
    });
    if (!client) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Client not found in this workspace');
  }

  private async withNumberRetry<T>(fn: (seq: number) => Promise<T>, workspaceId: string): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await this.prisma.invoice.count({ where: { workspaceId } });
      const seq = count + 1 + attempt;
      try {
        return await fn(seq);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
        throw err;
      }
    }
    throw new ConflictError(ErrorCodes.CONFLICT, 'Could not assign a unique invoice number');
  }
}
