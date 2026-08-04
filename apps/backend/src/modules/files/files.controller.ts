import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { FilesService } from './files.service';
import { PresignUploadDto } from './dto/file.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('files')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/files')
export class FilesController {
  constructor(private readonly files: FilesService) {}

  @Post('presign-upload')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('documents:write')
  @ApiOperation({ summary: 'Get a presigned PUT URL; client uploads bytes directly to S3' })
  presignUpload(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Body() dto: PresignUploadDto) {
    return this.files.presignUpload(req.user!.userId, o, w, dto);
  }

  @Get(':documentId/download-url')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('documents:read')
  @ApiOperation({ summary: 'Get a presigned GET URL for a document' })
  presignDownload(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('documentId') id: string) {
    return this.files.presignDownload(o, w, id);
  }
}
