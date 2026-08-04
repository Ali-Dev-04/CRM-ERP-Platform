import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import type { Request } from 'express';
import type { AttendanceStatus } from '@prisma/client';
import { AttendanceService } from './attendance.service';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

class ClockInDto {
  @IsOptional()
  @IsEnum(['PRESENT', 'REMOTE', 'HALF_DAY', 'LEAVE', 'ABSENT'])
  status?: AttendanceStatus;
}

@ApiTags('attendance')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/employees/:employeeId/attendance')
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}

  @Post('clock-in')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('attendance:write')
  clockIn(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('employeeId') e: string, @Body() dto: ClockInDto) {
    return this.attendance.clockIn(req.user!.userId, o, w, e, dto.status);
  }

  @Post('clock-out')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('attendance:write')
  clockOut(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('employeeId') e: string) {
    return this.attendance.clockOut(req.user!.userId, o, w, e);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('attendance:read')
  list(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('employeeId') e: string, @Query() p: PaginationDto) {
    return this.attendance.listByEmployee(o, w, e, p);
  }
}
