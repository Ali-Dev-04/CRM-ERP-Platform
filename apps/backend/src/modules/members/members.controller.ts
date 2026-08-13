import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { MembersService } from './members.service';
import { InviteMemberDto, UpdateMemberRoleDto } from './dto/members.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('members')
@ApiBearerAuth()
@Controller('organizations/:organizationId/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('members:manage')
  @ApiOperation({ summary: 'List organization members (managers only)' })
  list(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') organizationId: string) {
    return this.members.list(req.user!.userId, organizationId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('members:manage')
  @ApiOperation({ summary: 'Invite a member by email (returns a temp password for new users)' })
  invite(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Body() dto: InviteMemberDto,
  ) {
    return this.members.invite(req.user!.userId, organizationId, dto);
  }

  @Patch(':userId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('members:manage')
  @ApiOperation({ summary: 'Change a member’s role' })
  updateRole(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.members.updateRole(req.user!.userId, organizationId, userId, dto);
  }

  @Delete(':userId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('members:manage')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  remove(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('userId') userId: string,
  ) {
    return this.members.remove(req.user!.userId, organizationId, userId);
  }
}
