import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { LeaveStatus } from '@prisma/client';
import { LeavesService } from './leaves.service';
import { CreateLeaveDto, ReviewLeaveDto } from './dto/leave.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('leaves')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId')
export class LeavesController {
  constructor(private readonly leaves: LeavesService) {}

  @Post('employees/:employeeId/leaves')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('leaves:write')
  request(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('employeeId') e: string, @Body() dto: CreateLeaveDto) {
    return this.leaves.request(req.user!.userId, o, w, e, dto);
  }

  @Get('employees/:employeeId/leaves')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('leaves:read')
  @ApiQuery({ name: 'status', required: false })
  list(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('employeeId') e: string, @Query() p: PaginationDto, @Query('status') s?: LeaveStatus) {
    return this.leaves.listByEmployee(o, w, e, p, s);
  }

  @Patch('leaves/:leaveId/review')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('leaves:write')
  @ApiOperation({ summary: 'Approve or reject a leave request' })
  review(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('leaveId') id: string, @Body() dto: ReviewLeaveDto) {
    return this.leaves.review(req.user!.userId, o, w, id, dto);
  }
}
