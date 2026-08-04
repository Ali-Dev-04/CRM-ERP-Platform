import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('payments')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('payments:write')
  @ApiOperation({ summary: 'Record a payment against an invoice (recomputes invoice status)' })
  create(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.payments.create(req.user!.userId, organizationId, workspaceId, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('payments:read')
  @ApiOperation({ summary: 'List payments (paginated)' })
  list(
    @Param('organizationId') organizationId: string,
    @Param('workspaceId') workspaceId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.payments.list(organizationId, workspaceId, pagination);
  }
}
