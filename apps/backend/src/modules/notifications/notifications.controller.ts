import { Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { NotificationsService } from './notifications.service';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiQuery({ name: 'unread', required: false, type: Boolean })
  list(@Req() req: Request & { user?: AuthUser }, @Query('unread') unread?: string) {
    return this.notifications.listForUser(req.user!.userId, unread === 'true');
  }

  @Get('unread-count')
  unreadCount(@Req() req: Request & { user?: AuthUser }) {
    return this.notifications.unreadCount(req.user!.userId);
  }

  @Patch(':id/read')
  markRead(@Req() req: Request & { user?: AuthUser }, @Param('id') id: string) {
    return this.notifications.markRead(req.user!.userId, id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  markAllRead(@Req() req: Request & { user?: AuthUser }) {
    return this.notifications.markAllRead(req.user!.userId);
  }
}
