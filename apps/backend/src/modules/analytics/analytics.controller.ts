import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('analytics/overview')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('analytics:read')
  @ApiOperation({ summary: 'Workspace KPIs: counts, task completion, finance' })
  overview(@Param('organizationId') o: string, @Param('workspaceId') w: string) {
    return this.analytics.overview(o, w);
  }

  @Get('reports/revenue')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('reports:read')
  @ApiQuery({ name: 'months', required: false, type: Number })
  @ApiOperation({ summary: 'Collected revenue by month (defaults to 6 months)' })
  revenue(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Query('months') months?: string) {
    return this.analytics.revenueByMonth(o, w, months ? Number(months) : 6);
  }
}
