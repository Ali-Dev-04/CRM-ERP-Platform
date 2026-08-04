import { Injectable } from '@nestjs/common';
import type { Payment } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { InvoicesService } from '../invoices/invoices.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError, ValidationError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { CreatePaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentsService {
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
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, workspaceId },
    });
    if (!invoice) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Invoice not found');
    if (invoice.status === 'DRAFT') {
      throw new ValidationError(ErrorCodes.VALIDATION, 'Cannot record a payment against a draft invoice');
    }
    if (invoice.status === 'CANCELLED' || invoice.status === 'PAID') {
      throw new ValidationError(ErrorCodes.VALIDATION, `Invoice is ${invoice.status}; no payment accepted`);
    }
    if (dto.amountCents > Number(invoice.totalCents)) {
      throw new ValidationError(ErrorCodes.VALIDATION, 'Payment exceeds invoice total');
    }

    const payment = await this.prisma.payment.create({
      data: {
        workspaceId,
        invoiceId: dto.invoiceId,
        amountCents: BigInt(dto.amountCents),
        currency: dto.currency ?? invoice.currency,
        method: dto.method,
        status: dto.status ?? 'COMPLETED',
        reference: dto.reference,
      },
    });

    // Recompute the invoice's paid status from all completed payments.
    await this.invoices.recalcPaidStatus(dto.invoiceId);

    this.audit
      .record({
        actorId,
        organizationId,
        action: 'payment.create',
        targetType: 'payment',
        targetId: payment.id,
        metadata: { invoiceId: dto.invoiceId, amountCents: dto.amountCents, method: dto.method },
      })
      .catch(() => undefined);
    return payment;
  }

  async list(
    organizationId: string,
    workspaceId: string,
    pagination: PaginationDto,
  ): Promise<Paginated<Payment>> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const where = { workspaceId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        skip: pagination.offset,
        take: pagination.size,
      }),
      this.prisma.payment.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }
}
