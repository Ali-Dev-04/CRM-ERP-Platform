import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { QuotationStatus } from '@prisma/client';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto, UpdateQuotationStatusDto } from './dto/quotation.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('quotations')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/quotations')
export class QuotationsController {
  constructor(private readonly quotations: QuotationsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('quotations:write')
  @ApiOperation({ summary: 'Create a draft quotation with line items' })
  create(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.quotations.create(req.user!.userId, organizationId, workspaceId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('quotations:read')
  @ApiQuery({ name: 'status', required: false })
  list(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: QuotationStatus,
  ) {
    return this.quotations.list(organizationId, workspaceId, pagination, status);
  }

  @Get(':quotationId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('quotations:read')
  get(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('quotationId') quotationId: string,
  ) {
    return this.quotations.get(organizationId, workspaceId, quotationId);
  }

  @Patch(':quotationId/status')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('quotations:write')
  @ApiOperation({ summary: 'Set status; status=CONVERTED turns the quote into a draft invoice' })
  setStatus(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('quotationId') quotationId: string,
    @Body() dto: UpdateQuotationStatusDto,
  ) {
    return this.quotations.setStatus(req.user!.userId, organizationId, workspaceId, quotationId, dto);
  }
}
