import { Injectable } from '@nestjs/common';
import { Prisma, type Quotation, type QuotationStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { InvoicesService } from '../invoices/invoices.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError, ConflictError, ValidationError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { computeTotals } from '../../common/utils/money';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto/quotation.dto';

const NUMBER_PREFIX = 'QT';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly invoices: InvoicesService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    dto: CreateQuotationDto,
  ): Promise<Quotation> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    await this.assertClientInWorkspace(workspaceId, dto.clientId);
    if (dto.lines.length === 0) {
      throw new ValidationError(ErrorCodes.VALIDATION, 'A quotation must have at least one line');
    }
    const discount = BigInt(dto.discountCents ?? 0);
    const tax = BigInt(dto.taxCents ?? 0);
    const totals = computeTotals(dto.lines, discount, tax);
    const year = new Date().getFullYear();

    return this.withNumberRetry(async (seq) => {
      const quotation = await this.prisma.quotation.create({
        data: {
          workspaceId,
          clientId: dto.clientId,
          number: `${NUMBER_PREFIX}-${year}-${String(seq).padStart(5, '0')}`,
          status: 'DRAFT',
          expiryDate: new Date(dto.expiryDate),
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
          action: 'quotation.create',
          targetType: 'quotation',
          targetId: quotation.id,
          metadata: { number: quotation.number, totalCents: quotation.totalCents.toString() },
        })
        .catch(() => undefined);
      return quotation;
    }, workspaceId);
  }

  async list(
    organizationId: string,
    workspaceId: string,
    pagination: PaginationDto,
    status?: QuotationStatus,
  ): Promise<Paginated<Quotation>> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const where = { workspaceId, ...(status ? { status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quotation.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.size,
        include: { lines: { orderBy: { position: 'asc' } } },
      }),
      this.prisma.quotation.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }

  async get(organizationId: string, workspaceId: string, quotationId: string): Promise<Quotation> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, workspaceId },
      include: { lines: { orderBy: { position: 'asc' } } },
    });
    if (!quotation) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Quotation not found');
    return quotation;
  }

  async setStatus(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    quotationId: string,
    dto: UpdateQuotationStatusDto,
  ): Promise<Quotation> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const quotation = await this.prisma.quotation.findFirst({
      where: { id: quotationId, workspaceId },
      include: { lines: true },
    });
    if (!quotation) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Quotation not found');

    if (dto.status === 'CONVERTED') {
      return this.convert(actorId, organizationId, workspaceId, quotation);
    }
    const updated = await this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: dto.status },
    });
    this.audit
      .record({
        actorId,
        organizationId,
        action: 'quotation.status_change',
        targetType: 'quotation',
        targetId: quotationId,
        metadata: { to: dto.status },
      })
      .catch(() => undefined);
    return updated;
  }

  /** Convert an accepted quotation into a draft invoice carrying its lines. */
  private async convert(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    quotation: Quotation & { lines: { description: string; quantity: Prisma.Decimal; unitPriceCents: bigint; position: number }[] },
  ) {
    if (quotation.status === 'CONVERTED') {
      throw new ConflictError(ErrorCodes.CONFLICT, 'Quotation already converted');
    }
    const invoice = await this.invoices.create(actorId, organizationId, workspaceId, {
      clientId: quotation.clientId,
      dueDate: new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10),
      currency: quotation.currency,
      discountCents: Number(quotation.discountCents),
      taxCents: Number(quotation.taxCents),
      notes: quotation.notes ?? undefined,
      lines: quotation.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPriceCents: Number(l.unitPriceCents),
        position: l.position,
      })),
    });
    const updated = await this.prisma.quotation.update({
      where: { id: quotation.id },
      data: { status: 'CONVERTED', convertedInvoiceId: invoice.id },
    });
    this.audit
      .record({
        actorId,
        organizationId,
        action: 'quotation.convert',
        targetType: 'quotation',
        targetId: quotation.id,
        metadata: { invoiceId: invoice.id },
      })
      .catch(() => undefined);
    return updated;
  }

  private async assertClientInWorkspace(workspaceId: string, clientId: string): Promise<void> {
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workspaceId, deletedAt: null },
    });
    if (!client) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Client not found in this workspace');
  }

  private async withNumberRetry<T>(fn: (seq: number) => Promise<T>, workspaceId: string): Promise<T> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const count = await this.prisma.quotation.count({ where: { workspaceId } });
      try {
        return await fn(count + 1 + attempt);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') continue;
        throw err;
      }
    }
    throw new ConflictError(ErrorCodes.CONFLICT, 'Could not assign a unique quotation number');
  }
}
