import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { ClientStatus } from '@prisma/client';
import { ClientsService } from './clients.service';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('clients')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clients:write')
  @ApiOperation({ summary: 'Create a client in a workspace' })
  create(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateClientDto,
  ) {
    return this.clients.create(req.user!.userId, organizationId, workspaceId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clients:read')
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiOperation({ summary: 'List clients (paginated)' })
  list(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: ClientStatus,
    @Query('search') search?: string,
  ) {
    return this.clients.list(organizationId, workspaceId, pagination, status, search);
  }

  @Get(':clientId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clients:read')
  @ApiOperation({ summary: 'Get a client' })
  get(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.clients.get(organizationId, workspaceId, clientId);
  }

  @Patch(':clientId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clients:write')
  @ApiOperation({ summary: 'Update a client' })
  update(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('clientId') clientId: string,
    @Body() dto: UpdateClientDto,
  ) {
    return this.clients.update(req.user!.userId, organizationId, workspaceId, clientId, dto);
  }

  @Delete(':clientId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clients:delete')
  @ApiOperation({ summary: 'Soft-delete a client' })
  remove(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('clientId') clientId: string,
  ) {
    return this.clients.remove(req.user!.userId, organizationId, workspaceId, clientId);
  }
}
