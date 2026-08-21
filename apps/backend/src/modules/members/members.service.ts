import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import * as argon2 from 'argon2';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { RbacService } from '../rbac/rbac.service';
import { UsageService } from '../billing/usage.service';
import { AuditService } from '../audit/audit.service';
import { ConflictError, NotFoundError, ValidationError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/members.dto';

export interface MemberView {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: string;
}

export interface InviteResult {
  member: MemberView;
  /** One-time temporary password (only when a new user was created). */
  tempPassword: string | null;
}

/**
 * Organization member management. Owners and Admins (members:manage) can list,
 * invite, re-role, and remove members. Mutations invalidate the affected user's
 * RBAC cache. The last Owner can never be removed or demoted.
 */
@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly rbac: RbacService,
    private readonly usage: UsageService,
    private readonly audit: AuditService,
  ) {}

  async list(actorId: string, organizationId: string): Promise<MemberView[]> {
    await this.organizations.requireMembership(actorId, organizationId);
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId },
      include: { user: true, role: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((m) => ({
      id: m.user.id,
      firstName: m.user.firstName,
      lastName: m.user.lastName,
      email: m.user.email,
      role: m.role.name,
      status: m.user.status,
    }));
  }

  async invite(actorId: string, organizationId: string, dto: InviteMemberDto): Promise<InviteResult> {
    await this.organizations.requireMembership(actorId, organizationId);
    await this.usage.assertSeatQuota(organizationId);
    const role = await this.requireSystemRole(dto.role);
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    let tempPassword: string | null = null;

    const member = await this.prisma.$transaction(async (tx) => {
      let userId: string;
      if (existing) {
        userId = existing.id;
        const already = await tx.membership.findUnique({
          where: { userId_organizationId: { userId, organizationId } },
        });
        if (already) throw new ConflictError(ErrorCodes.CONFLICT, 'That user is already a member');
      } else {
        tempPassword = randomBytes(12).toString('base64url');
        const passwordHash = await argon2.hash(tempPassword, { type: argon2.argon2id });
        const created = await tx.user.create({
          data: {
            email: dto.email,
            firstName: dto.firstName ?? 'Team',
            lastName: dto.lastName ?? 'Member',
            passwordHash,
            status: 'ACTIVE',
          },
        });
        userId = created.id;
      }
      await tx.membership.create({ data: { userId, organizationId, roleId: role.id } });
      const user = existing ?? (await tx.user.findUniqueOrThrow({ where: { id: userId } }));
      return {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: dto.role,
        status: user.status,
      } satisfies MemberView;
    });

    this.audit
      .record({ actorId, organizationId, action: 'member.invite', targetType: 'membership', targetId: member.id, metadata: { role: dto.role } })
      .catch(() => undefined);
    return { member, tempPassword };
  }

  async updateRole(actorId: string, organizationId: string, userId: string, dto: UpdateMemberRoleDto): Promise<MemberView> {
    await this.organizations.requireMembership(actorId, organizationId);
    const role = await this.requireSystemRole(dto.role);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: { select: { name: true } }, user: true },
    });
    if (!membership) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Member not found');
    await this.guardLastOwner(organizationId, membership.role.name);

    await this.prisma.membership.update({
      where: { userId_organizationId: { userId, organizationId } },
      data: { roleId: role.id },
    });
    await this.rbac.invalidate(userId, organizationId);
    this.audit
      .record({ actorId, organizationId, action: 'member.role_change', targetType: 'membership', targetId: userId, metadata: { from: membership.role.name, to: dto.role } })
      .catch(() => undefined);
    return {
      id: membership.user.id,
      firstName: membership.user.firstName,
      lastName: membership.user.lastName,
      email: membership.user.email,
      role: dto.role,
      status: membership.user.status,
    };
  }

  async remove(actorId: string, organizationId: string, userId: string): Promise<{ removed: true }> {
    await this.organizations.requireMembership(actorId, organizationId);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { role: { select: { name: true } } },
    });
    if (!membership) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Member not found');
    await this.guardLastOwner(organizationId, membership.role.name);
    // Remove the membership; keep the user (they may belong to other orgs).
    await this.prisma.membership.delete({ where: { userId_organizationId: { userId, organizationId } } });
    await this.rbac.invalidate(userId, organizationId);
    this.audit
      .record({ actorId, organizationId, action: 'member.remove', targetType: 'membership', targetId: userId })
      .catch(() => undefined);
    return { removed: true };
  }

  /** Throws if removing/demoting would leave the org with no Owners. */
  private async guardLastOwner(organizationId: string, currentRoleName: string) {
    if (currentRoleName !== 'Owner') return;
    const ownerCount = await this.prisma.membership.count({
      where: { organizationId, role: { name: 'Owner', organizationId: null, isSystem: true } },
    });
    if (ownerCount <= 1) {
      throw new ConflictError(ErrorCodes.CONFLICT, 'Cannot remove or demote the last Owner');
    }
  }

  private async requireSystemRole(name: string) {
    const role = await this.prisma.role.findFirst({ where: { name, organizationId: null, isSystem: true } });
    if (!role) throw new ValidationError(ErrorCodes.VALIDATION, `Unknown role: ${name}`);
    return role;
  }
}
