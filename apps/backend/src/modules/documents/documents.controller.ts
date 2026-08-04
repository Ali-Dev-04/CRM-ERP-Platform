import { Body, Controller, Delete, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';
import type { Request } from 'express';
import { DocumentsService } from './documents.service';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

class RegisterDocumentDto {
  @IsString()
  name: string;

  @ApiProperty({ description: 'S3 object key the bytes were uploaded to' })
  @IsString()
  storageKey: string;

  @IsString()
  mimeType: string;

  @IsInt()
  @Min(0)
  sizeBytes: number;
}

@ApiTags('documents')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('documents:write')
  register(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Body() dto: RegisterDocumentDto) {
    return this.documents.register(req.user!.userId, o, w, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('documents:read')
  list(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Query() p: PaginationDto) {
    return this.documents.list(o, w, p);
  }

  @Delete(':documentId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('documents:write')
  remove(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('documentId') id: string) {
    return this.documents.remove(req.user!.userId, o, w, id);
  }
}
