import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AssetStatus } from '@prisma/client';
import { AssetsService } from './assets.service';
import { CreateAssetDto, UpdateAssetDto, AssignAssetDto } from './dto/asset.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('assets')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/assets')
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('assets:write')
  create(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Body() dto: CreateAssetDto) {
    return this.assets.create(req.user!.userId, o, w, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('assets:read')
  @ApiQuery({ name: 'status', required: false })
  list(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Query() p: PaginationDto, @Query('status') s?: AssetStatus) {
    return this.assets.list(o, w, p, s);
  }

  @Get(':assetId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('assets:read')
  get(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('assetId') id: string) {
    return this.assets.get(o, w, id);
  }

  @Patch(':assetId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('assets:write')
  update(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('assetId') id: string, @Body() dto: UpdateAssetDto) {
    return this.assets.update(req.user!.userId, o, w, id, dto);
  }

  @Patch(':assetId/assign')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('assets:write')
  @ApiOperation({ summary: 'Assign/unassign an asset to an employee' })
  assign(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('assetId') id: string, @Body() dto: AssignAssetDto) {
    return this.assets.assign(req.user!.userId, o, w, id, dto);
  }

  @Delete(':assetId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('assets:write')
  remove(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('assetId') id: string) {
    return this.assets.remove(req.user!.userId, o, w, id);
  }
}
