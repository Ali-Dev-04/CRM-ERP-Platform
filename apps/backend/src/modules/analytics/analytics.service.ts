import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

/**
 * Read-only workspace analytics. Aggregations are computed on demand from the
 * transactional tables (fine at this scale; M8 can add materialized rollups).
 * Money is returned as string cents to keep BigInt JSON-safe.
 */
@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  async overview(orgId: string, wsId: string) {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);

    const [clients, activeProjects, employees, tasksByStatus, paidInvoices, outstandingInvoices, overdueInvoices, payments] = await Promise.all([
      this.prisma.client.count({ where: { workspaceId: wsId, deletedAt: null } }),
      this.prisma.project.count({ where: { workspaceId: wsId, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { workspaceId: wsId, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.task.groupBy({ by: ['status'], where: { project: { workspaceId: wsId } }, _count: { _all: true } }),
      this.prisma.invoice.aggregate({ where: { workspaceId: wsId, status: 'PAID' }, _sum: { totalCents: true } }),
      this.prisma.invoice.aggregate({
        where: { workspaceId: wsId, status: { in: ['SENT', 'PARTIALLY_PAID'] } },
        _sum: { totalCents: true },
      }),
      this.prisma.invoice.aggregate({ where: { workspaceId: wsId, status: 'OVERDUE' }, _sum: { totalCents: true } }),
      this.prisma.payment.aggregate({ where: { workspaceId: wsId, status: 'COMPLETED' }, _sum: { amountCents: true } }),
    ]);

    const tasks = Object.fromEntries(tasksByStatus.map((t) => [t.status, t._count._all]));
    const taskTotal = Object.values(tasks).reduce((a, b) => a + b, 0);
    const done = tasks['DONE'] ?? 0;

    return {
      counts: { clients, activeProjects, employees },
      tasks: { byStatus: tasks, total: taskTotal, completionRate: taskTotal === 0 ? 0 : Math.round((done / taskTotal) * 1000) / 10 },
      finance: {
        revenuePaidCents: (paidInvoices._sum.totalCents ?? 0n).toString(),
        outstandingCents: (outstandingInvoices._sum.totalCents ?? 0n).toString(),
        overdueCents: (overdueInvoices._sum.totalCents ?? 0n).toString(),
        collectedPaymentsCents: (payments._sum.amountCents ?? 0n).toString(),
      },
    };
  }

  async revenueByMonth(orgId: string, wsId: string, months = 6) {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const since = new Date();
    since.setMonth(since.getMonth() - months);
    const payments = await this.prisma.payment.findMany({
      where: { workspaceId: wsId, status: 'COMPLETED', paidAt: { gte: since } },
      select: { amountCents: true, paidAt: true },
    });
    const buckets = new Map<string, bigint>();
    for (const p of payments) {
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
      buckets.set(key, (buckets.get(key) ?? 0n) + p.amountCents);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, totalCents]) => ({ month, totalCents: totalCents.toString() }));
  }
}
