import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { InvoiceStatus } from '@prisma/client';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceStatusDto } from './dto/invoice.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('invoices')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('invoices:write')
  @ApiOperation({ summary: 'Create a draft invoice with line items' })
  create(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInvoiceDto,
  ) {
    return this.invoices.create(req.user!.userId, organizationId, workspaceId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('invoices:read')
  @ApiQuery({ name: 'status', required: false })
  @ApiOperation({ summary: 'List invoices (paginated)' })
  list(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
    @Query('status') status?: InvoiceStatus,
  ) {
    return this.invoices.list(organizationId, workspaceId, pagination, status);
  }

  @Get(':invoiceId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('invoices:read')
  @ApiOperation({ summary: 'Get an invoice with lines and payments' })
  get(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.invoices.get(organizationId, workspaceId, invoiceId);
  }

  @Patch(':invoiceId/status')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('invoices:write')
  @ApiOperation({ summary: 'Transition invoice status' })
  setStatus(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
    @Body() dto: UpdateInvoiceStatusDto,
  ) {
    return this.invoices.setStatus(req.user!.userId, organizationId, workspaceId, invoiceId, dto);
  }

  @Delete(':invoiceId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('invoices:delete')
  @ApiOperation({ summary: 'Delete a draft invoice' })
  remove(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Param('invoiceId') invoiceId: string,
  ) {
    return this.invoices.remove(req.user!.userId, organizationId, workspaceId, invoiceId);
  }
}
