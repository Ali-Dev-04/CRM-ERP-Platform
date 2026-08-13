import { Injectable } from '@nestjs/common';
import type { Task } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';

/**
 * The signed-in user's own data, workspace-scoped. Used for the Member
 * "My focus" dashboard (their assigned tasks across the workspace's projects).
 */
@Injectable()
export class MeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
  ) {}

  async assignedTasks(organizationId: string, workspaceId: string, userId: string): Promise<Task[]> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    return this.prisma.task.findMany({
      where: { assigneeId: userId, project: { workspaceId, deletedAt: null } },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
      include: { project: { select: { id: true, name: true } } },
    });
  }
}
