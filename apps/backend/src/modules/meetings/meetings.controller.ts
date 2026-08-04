import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { MeetingsService } from './meetings.service';
import { CreateMeetingDto, UpdateMeetingDto } from './dto/meeting.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { CalendarService } from '../calendar/calendar.service';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('meetings')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId')
export class MeetingsController {
  constructor(
    private readonly meetings: MeetingsService,
    private readonly calendarService: CalendarService,
  ) {}

  @Post('meetings')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('meetings:write')
  create(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.meetings.create(req.user!.userId, organizationId, workspaceId, dto);
  }

  @Get('meetings')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('meetings:read')
  list(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.meetings.list(organizationId, workspaceId, pagination);
  }

  @Get('meetings/:meetingId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('meetings:read')
  get(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('meetingId') meetingId: string,
  ) {
    return this.meetings.get(organizationId, workspaceId, meetingId);
  }

  @Patch('meetings/:meetingId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('meetings:write')
  update(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: UpdateMeetingDto,
  ) {
    return this.meetings.update(req.user!.userId, organizationId, workspaceId, meetingId, dto);
  }

  @Delete('meetings/:meetingId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('meetings:write')
  remove(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('meetingId') meetingId: string,
  ) {
    return this.meetings.remove(req.user!.userId, organizationId, workspaceId, meetingId);
  }

  @Get('calendar')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('tasks:read')
  @ApiOperation({ summary: 'Agenda: meetings + tasks with due dates in a date range' })
  calendar(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.calendarService.aggregate(organizationId, workspaceId, from, to);
  }
}
