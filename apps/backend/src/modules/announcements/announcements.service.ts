import { Injectable } from '@nestjs/common';
import type { Announcement } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';

export interface CreateAnnouncementInput {
  title: string;
  body: string;
  publish?: boolean;
}

@Injectable()
export class AnnouncementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async create(actorId: string, orgId: string, wsId: string, input: CreateAnnouncementInput): Promise<Announcement> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const ann = await this.prisma.announcement.create({
      data: {
        workspaceId: wsId,
        title: input.title,
        body: input.body,
        createdById: actorId,
        publishedAt: input.publish ? new Date() : null,
      },
    });
    this.audit.record({ actorId, organizationId: orgId, action: 'announcement.create', targetType: 'announcement', targetId: ann.id }).catch(() => undefined);
    return ann;
  }

  async list(orgId: string, wsId: string, pagination: PaginationDto, publishedOnly = false): Promise<Paginated<Announcement>> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const where = { workspaceId: wsId, ...(publishedOnly ? { publishedAt: { not: null } } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.announcement.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pagination.offset, take: pagination.size }),
      this.prisma.announcement.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }

  async publish(actorId: string, orgId: string, wsId: string, id: string): Promise<Announcement> {
    await this.load(orgId, wsId, id);
    return this.prisma.announcement.update({ where: { id }, data: { publishedAt: new Date() } });
  }

  async remove(actorId: string, orgId: string, wsId: string, id: string): Promise<{ deleted: true }> {
    await this.load(orgId, wsId, id);
    await this.prisma.announcement.delete({ where: { id } });
    this.audit.record({ actorId, organizationId: orgId, action: 'announcement.delete', targetType: 'announcement', targetId: id }).catch(() => undefined);
    return { deleted: true };
  }

  private async load(orgId: string, wsId: string, id: string): Promise<Announcement> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const ann = await this.prisma.announcement.findFirst({ where: { id, workspaceId: wsId } });
    if (!ann) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Announcement not found');
    return ann;
  }
}
