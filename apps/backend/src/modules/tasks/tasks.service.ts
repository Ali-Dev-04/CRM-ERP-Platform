import { Injectable } from '@nestjs/common';
import type { Task, TaskStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto } from './dto/task.dto';

/**
 * Tasks belong to a project. Kanban ordering: tasks carry a `position` within
 * their status column. Moving a task renames the destination column's order
 * transactionally (integer positions, 0-based) — O(column) writes, no float
 * drift, always consistent.
 */
@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    projectId: string,
    dto: CreateTaskDto,
  ): Promise<Task> {
    await this.projects.load(organizationId, workspaceId, projectId);
    const status = dto.status ?? 'TODO';
    const count = await this.prisma.task.count({ where: { projectId, status } });
    const task = await this.prisma.task.create({
      data: {
        projectId,
        title: dto.title,
        description: dto.description,
        status,
        priority: dto.priority ?? 'MEDIUM',
        position: count, // append to end of the column
        assigneeId: dto.assigneeId,
        createdById: actorId,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
      },
    });
    this.audit
      .record({ actorId, organizationId, action: 'task.create', targetType: 'task', targetId: task.id })
      .catch(() => undefined);
    return task;
  }

  async list(
    organizationId: string,
    workspaceId: string,
    projectId: string,
    status?: TaskStatus,
    assigneeId?: string,
  ): Promise<Task[]> {
    await this.projects.load(organizationId, workspaceId, projectId);
    return this.prisma.task.findMany({
      where: {
        projectId,
        ...(status ? { status } : {}),
        ...(assigneeId ? { assigneeId } : {}),
      },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });
  }

  async get(organizationId: string, workspaceId: string, projectId: string, taskId: string): Promise<Task> {
    return this.load(organizationId, workspaceId, projectId, taskId);
  }

  async update(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
    dto: UpdateTaskDto,
  ): Promise<Task> {
    await this.load(organizationId, workspaceId, projectId, taskId);
    return this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...dto,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
    });
  }

  async remove(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<{ deleted: true }> {
    await this.load(organizationId, workspaceId, projectId, taskId);
    await this.prisma.task.delete({ where: { id: taskId } });
    this.audit
      .record({ actorId, organizationId, action: 'task.delete', targetType: 'task', targetId: taskId })
      .catch(() => undefined);
    return { deleted: true };
  }

  /** Move a task to a status column at a given index, renumbering the column. */
  async move(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
    dto: MoveTaskDto,
  ): Promise<Task> {
    await this.load(organizationId, workspaceId, projectId, taskId);

    const column = await this.prisma.task.findMany({
      where: { projectId, status: dto.status, id: { not: taskId } },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const index = Math.min(dto.index, column.length);
    column.splice(index, 0, { id: taskId });

    await this.prisma.$transaction(
      column.map((t, i) =>
        this.prisma.task.update({
          where: { id: t.id },
          data: { position: i, status: dto.status },
        }),
      ),
    );
    return this.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
  }

  private async load(
    organizationId: string,
    workspaceId: string,
    projectId: string,
    taskId: string,
  ): Promise<Task> {
    await this.projects.load(organizationId, workspaceId, projectId);
    const task = await this.prisma.task.findFirst({ where: { id: taskId, projectId } });
    if (!task) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Task not found');
    return task;
  }
}
