import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { KnowledgeService } from './knowledge.service';
import { CreateArticleDto, UpdateArticleDto } from './dto/knowledge.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('knowledge')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('knowledge:write')
  create(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Body() dto: CreateArticleDto) {
    return this.knowledge.create(req.user!.userId, o, w, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('knowledge:read')
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'publishedOnly', required: false, type: Boolean })
  list(
    @Param('organizationId') o: string,
    @Param('workspaceId') w: string,
    @Query('search') search?: string,
    @Query('publishedOnly') publishedOnly?: string,
  ) {
    return this.knowledge.list(o, w, { search, publishedOnly: publishedOnly === 'true' });
  }

  @Get(':articleId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('knowledge:read')
  get(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('articleId') id: string) {
    return this.knowledge.get(o, w, id);
  }

  @Patch(':articleId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('knowledge:write')
  update(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('articleId') id: string, @Body() dto: UpdateArticleDto) {
    return this.knowledge.update(req.user!.userId, o, w, id, dto);
  }

  @Delete(':articleId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('knowledge:write')
  remove(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('articleId') id: string) {
    return this.knowledge.remove(req.user!.userId, o, w, id);
  }
}
