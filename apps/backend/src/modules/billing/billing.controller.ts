import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrganizationPlan } from '@prisma/client';
import type { Request } from 'express';
import { BillingService } from './billing.service';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

class ChangePlanDto {
  @IsEnum(OrganizationPlan)
  plan: OrganizationPlan;
}

@ApiTags('billing')
@ApiBearerAuth()
@Controller('organizations/:organizationId/billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  @ApiOperation({ summary: 'Current plan, limits, and usage (any member can view)' })
  overview(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') organizationId: string) {
    return this.billing.getOverview(req.user!.userId, organizationId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Available plans and their limits' })
  plans() {
    return this.billing.listPlans();
  }

  @Post('plan')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('billing:manage')
  @ApiOperation({ summary: 'Upgrade/downgrade the plan (Owner only; mock checkout)' })
  changePlan(
    @Req() req: Request & { user?: AuthUser },
    @Param('organizationId') organizationId: string,
    @Body() dto: ChangePlanDto,
  ) {
    return this.billing.changePlan(req.user!.userId, organizationId, dto.plan);
  }
}
