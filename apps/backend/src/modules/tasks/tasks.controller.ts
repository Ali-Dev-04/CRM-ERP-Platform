import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { TaskStatus } from '@prisma/client';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, MoveTaskDto } from './dto/task.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/projects/:projectId/tasks')
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tasks:write')
  create(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(req.user!.userId, organizationId, workspaceId, projectId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tasks:read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'assigneeId', required: false })
  list(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Query('status') status?: TaskStatus,
    @Query('assigneeId') assigneeId?: string,
  ) {
    return this.tasks.list(organizationId, workspaceId, projectId, status, assigneeId);
  }

  @Get(':taskId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tasks:read')
  get(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasks.get(organizationId, workspaceId, projectId, taskId);
  }

  @Patch(':taskId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tasks:write')
  update(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(req.user!.userId, organizationId, workspaceId, projectId, taskId, dto);
  }

  @Patch(':taskId/move')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tasks:write')
  @ApiOperation({ summary: 'Move/reorder a task within the kanban board' })
  move(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Body() dto: MoveTaskDto,
  ) {
    return this.tasks.move(req.user!.userId, organizationId, workspaceId, projectId, taskId, dto);
  }

  @Delete(':taskId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tasks:delete')
  remove(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
  ) {
    return this.tasks.remove(req.user!.userId, organizationId, workspaceId, projectId, taskId);
  }
}
