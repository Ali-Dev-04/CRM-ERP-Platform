import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ForbiddenError, ConflictError, NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { toSlug } from '../../common/utils/slug';

/**
 * Organization tenancy operations. Membership is checked on every read so a
 * user can never reach across into another tenant's data — the service layer
 * is the tenant boundary, not just the route layer.
 */
@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Organizations the user belongs to, with their role in each. */
  async listForUser(userId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: { organization: true, role: { select: { name: true } } },
    });
    return memberships.map((m) => ({
      organization: m.organization,
      role: m.role.name,
    }));
  }

  async getOrganization(userId: string, organizationId: string) {
    await this.requireMembership(userId, organizationId);
    return this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
  }

  async listWorkspaces(userId: string, organizationId: string) {
    await this.requireMembership(userId, organizationId);
    return this.prisma.workspace.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createWorkspace(userId: string, organizationId: string, name: string) {
    await this.requireMembership(userId, organizationId);
    const slug = toSlug(name);
    const existing = await this.prisma.workspace.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
    });
    if (existing) {
      throw new ConflictError(
        ErrorCodes.ORG_SLUG_TAKEN,
        'A workspace with that name already exists',
      );
    }
    return this.prisma.workspace.create({
      data: { organizationId, name, slug },
    });
  }

  async requireMembership(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
    });
    if (!membership) {
      throw new ForbiddenError(
        ErrorCodes.MEMBERSHIP_REQUIRED,
        'You are not a member of this organization',
      );
    }
    return membership;
  }

  /**
   * Verifies a workspace belongs to the given organization and is active.
   * Used by workspace-scoped modules to close the cross-tenant gap: a member
   * of org A must not reach org B's workspace by manipulating the URL.
   */
  async assertWorkspaceInOrg(workspaceId: string, organizationId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
    });
    if (!workspace || workspace.deletedAt || workspace.organizationId !== organizationId) {
      throw new NotFoundError(
        ErrorCodes.WORKSPACE_NOT_FOUND,
        'Workspace not found in this organization',
      );
    }
    return workspace;
  }
}
