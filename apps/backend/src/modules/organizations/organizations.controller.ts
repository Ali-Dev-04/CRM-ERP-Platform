import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { OrganizationsService } from './organizations.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  @ApiOperation({ summary: 'Organizations the current user belongs to' })
  listMine(@Req() req: Request & { user?: AuthUser }) {
    return this.organizations.listForUser(req.user!.userId);
  }

  @Get(':organizationId')
  @ApiOperation({ summary: 'A single organization (membership required)' })
  getOne(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizations.getOrganization(req.user!.userId, organizationId);
  }

  @Get(':organizationId/workspaces')
  @ApiOperation({ summary: 'Workspaces in an organization' })
  listWorkspaces(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
  ) {
    return this.organizations.listWorkspaces(req.user!.userId, organizationId);
  }

  @Post(':organizationId/workspaces')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('org:manage')
  @ApiOperation({ summary: 'Create a workspace (org managers only)' })
  createWorkspace(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateWorkspaceDto,
  ) {
    return this.organizations.createWorkspace(req.user!.userId, organizationId, dto.name);
  }
}
