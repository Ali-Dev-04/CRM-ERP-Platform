import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { MeService } from './me.service';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('me')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/me')
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get('tasks')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: "The current user's assigned tasks in this workspace" })
  tasks(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
  ) {
    return this.me.assignedTasks(organizationId, workspaceId, req.user!.userId);
  }
}
