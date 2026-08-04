import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

export interface AuditEntry {
  actorId?: string;
  organizationId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Prisma.InputJsonValue;
  ip?: string;
  userAgent?: string;
}

/**
 * Append-only audit trail. Writes are best-effort: a logging failure must
 * never break the user's request, so errors are swallowed + logged.
 * Structured for later export to SIEM/warehouse.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: entry });
    } catch (err) {
      this.logger.error(
        `Failed to write audit log for action="${entry.action}": ${(err as Error).message}`,
      );
    }
  }

  async listForOrganization(
    organizationId: string,
    opts: { take?: number; skip?: number; action?: string } = {},
  ) {
    const where = {
      organizationId,
      ...(opts.action ? { action: opts.action } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: opts.take ?? 25,
        skip: opts.skip ?? 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total };
  }
}
