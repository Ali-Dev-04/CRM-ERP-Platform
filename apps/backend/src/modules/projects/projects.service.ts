import { Injectable } from '@nestjs/common';
import type { Project, ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    dto: CreateProjectDto,
  ): Promise<Project> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const project = await this.prisma.project.create({
      data: {
        workspaceId,
        name: dto.name,
        description: dto.description,
        status: dto.status ?? 'PLANNING',
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        createdById: actorId,
      },
    });
    this.audit
      .record({ actorId, organizationId, action: 'project.create', targetType: 'project', targetId: project.id })
      .catch(() => undefined);
    return project;
  }

  async list(
    organizationId: string,
    workspaceId: string,
    pagination: PaginationDto,
    status?: ProjectStatus,
  ): Promise<Paginated<Project>> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const where = { workspaceId, deletedAt: null, ...(status ? { status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.size,
        include: { _count: { select: { tasks: true } } },
      }),
      this.prisma.project.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }

  async get(organizationId: string, workspaceId: string, projectId: string): Promise<Project> {
    return this.load(organizationId, workspaceId, projectId);
  }

  async update(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<Project> {
    await this.load(organizationId, workspaceId, projectId);
    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
  }

  async remove(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    projectId: string,
  ): Promise<{ deleted: true }> {
    await this.load(organizationId, workspaceId, projectId);
    await this.prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
    this.audit
      .record({ actorId, organizationId, action: 'project.delete', targetType: 'project', targetId: projectId })
      .catch(() => undefined);
    return { deleted: true };
  }

  /** Load a project and confirm it lives in the given workspace. */
  async load(organizationId: string, workspaceId: string, projectId: string): Promise<Project> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, workspaceId, deletedAt: null },
    });
    if (!project) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Project not found');
    return project;
  }
}
