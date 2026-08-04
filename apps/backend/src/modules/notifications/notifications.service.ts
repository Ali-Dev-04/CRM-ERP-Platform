import { Injectable } from '@nestjs/common';
import type { Notification } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

export interface CreateNotificationInput {
  userId: string;
  organizationId?: string;
  type: string;
  title: string;
  message: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Programmatic creation (called by other modules). */
  async create(input: CreateNotificationInput): Promise<Notification> {
    return this.prisma.notification.create({ data: input });
  }

  async listForUser(userId: string, unreadOnly = false): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unreadCount(userId: string): Promise<{ unread: number }> {
    const unread = await this.prisma.notification.count({ where: { userId, readAt: null } });
    return { unread };
  }

  async markRead(userId: string, notificationId: string): Promise<Notification> {
    const n = await this.prisma.notification.findFirst({ where: { id: notificationId, userId } });
    if (!n) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Notification not found');
    return this.prisma.notification.update({ where: { id: notificationId }, data: { readAt: new Date() } });
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const r = await this.prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
    return { updated: r.count };
  }
}
