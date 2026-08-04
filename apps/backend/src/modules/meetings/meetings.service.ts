import { Injectable } from '@nestjs/common';
import type { Meeting } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { CreateMeetingDto, UpdateMeetingDto } from './dto/meeting.dto';

@Injectable()
export class MeetingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    dto: CreateMeetingDto,
  ): Promise<Meeting> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const meeting = await this.prisma.meeting.create({
      data: {
        workspaceId,
        projectId: dto.projectId ?? null,
        title: dto.title,
        agenda: dto.agenda,
        location: dto.location,
        scheduledAt: new Date(dto.scheduledAt),
        durationMinutes: dto.durationMinutes ?? 30,
        notes: dto.notes,
        createdById: actorId,
        attendees: {
          create: (dto.attendeeIds ?? []).map((userId) => ({ userId })),
        },
      },
      include: { attendees: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } },
    });
    this.audit
      .record({ actorId, organizationId, action: 'meeting.create', targetType: 'meeting', targetId: meeting.id })
      .catch(() => undefined);
    return meeting;
  }

  async list(
    organizationId: string,
    workspaceId: string,
    pagination: PaginationDto,
  ): Promise<Paginated<Meeting>> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const where = { workspaceId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.meeting.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
        skip: pagination.offset,
        take: pagination.size,
        include: { attendees: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } },
      }),
      this.prisma.meeting.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }

  async get(organizationId: string, workspaceId: string, meetingId: string): Promise<Meeting> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const meeting = await this.prisma.meeting.findFirst({
      where: { id: meetingId, workspaceId },
      include: { attendees: { include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } } } },
    });
    if (!meeting) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Meeting not found');
    return meeting;
  }

  async update(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    meetingId: string,
    dto: UpdateMeetingDto,
  ): Promise<Meeting> {
    await this.get(organizationId, workspaceId, meetingId);
    return this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
    });
  }

  async remove(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    meetingId: string,
  ): Promise<{ deleted: true }> {
    await this.get(organizationId, workspaceId, meetingId);
    await this.prisma.meeting.delete({ where: { id: meetingId } });
    this.audit
      .record({ actorId, organizationId, action: 'meeting.delete', targetType: 'meeting', targetId: meetingId })
      .catch(() => undefined);
    return { deleted: true };
  }
}
