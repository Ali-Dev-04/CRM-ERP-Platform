import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiQuery, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AnnouncementsService } from './announcements.service';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

class CreateAnnouncementDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  body: string;

  @ApiProperty({ default: false })
  @IsOptional()
  @IsBoolean()
  publish?: boolean;
}

@ApiTags('announcements')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/announcements')
export class AnnouncementsController {
  constructor(private readonly announcements: AnnouncementsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('org:manage')
  create(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Body() dto: CreateAnnouncementDto) {
    return this.announcements.create(req.user!.userId, o, w, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clients:read') // any workspace member can read
  @ApiQuery({ name: 'publishedOnly', required: false, type: Boolean })
  list(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Query() p: PaginationDto, @Query('publishedOnly') pub?: string) {
    return this.announcements.list(o, w, p, pub === 'true');
  }

  @Patch(':id/publish')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('org:manage')
  publish(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('id') id: string) {
    return this.announcements.publish(req.user!.userId, o, w, id);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('org:manage')
  remove(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('id') id: string) {
    return this.announcements.remove(req.user!.userId, o, w, id);
  }
}
