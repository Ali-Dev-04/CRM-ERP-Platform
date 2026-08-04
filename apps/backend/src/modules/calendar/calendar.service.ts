import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

const DEFAULT_RANGE_DAYS = 30;

/**
 * Calendar aggregation: meetings scheduled in a window, plus tasks (with due
 * dates) landing in that window. Tasks join through their project to ensure
 * workspace scoping. `from`/`to` default to [now, now+30d].
 */
@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  async aggregate(organizationId: string, workspaceId: string, from?: string, to?: string) {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const start = from ? new Date(from) : new Date();
    const end = to ? new Date(to) : new Date(Date.now() + DEFAULT_RANGE_DAYS * 86_400_000);

    const [meetings, tasks] = await Promise.all([
      this.prisma.meeting.findMany({
        where: { workspaceId, scheduledAt: { gte: start, lte: end } },
        orderBy: { scheduledAt: 'asc' },
        include: {
          attendees: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        },
      }),
      this.prisma.task.findMany({
        where: {
          dueDate: { gte: start, lte: end },
          project: { workspaceId, deletedAt: null },
        },
        orderBy: { dueDate: 'asc' },
        include: { project: { select: { id: true, name: true } } },
      }),
    ]);

    return { range: { from: start.toISOString(), to: end.toISOString() }, meetings, tasks };
  }
}
