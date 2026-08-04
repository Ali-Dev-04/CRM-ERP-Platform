import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { ProjectStatus } from '@prisma/client';
import { ProjectsService } from './projects.service';
import { CreateProjectDto, UpdateProjectDto } from './dto/project.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('projects:write')
  create(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projects.create(req.user!.userId, organizationId, workspaceId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('projects:read')
  @ApiQuery({ name: 'status', required: false })
  list(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.projects.list(organizationId, workspaceId, pagination, status);
  }

  @Get(':projectId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('projects:read')
  get(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projects.get(organizationId, workspaceId, projectId);
  }

  @Patch(':projectId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('projects:write')
  update(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projects.update(req.user!.userId, organizationId, workspaceId, projectId, dto);
  }

  @Delete(':projectId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('projects:delete')
  remove(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.projects.remove(req.user!.userId, organizationId, workspaceId, projectId);
  }
}
