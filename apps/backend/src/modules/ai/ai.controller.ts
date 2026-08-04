import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AiService } from './ai.service';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';

class GoalDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  goal: string;
}
class IntentDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  intent: string;

  @ApiPropertyOptional({ enum: ['professional', 'friendly', 'formal', 'urgent'], default: 'professional' })
  @IsOptional()
  @IsIn(['professional', 'friendly', 'formal', 'urgent'])
  tone?: string;
}
class ScopeDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  scope: string;
}
class QueryDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  query: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/ai')
export class AiController {
  constructor(private readonly ai: AiService) {}

  @Post('project-manager/:projectId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('projects:read')
  projectManager(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('projectId') p: string) {
    return this.ai.projectManager(o, w, p);
  }

  @Post('task-generator/:projectId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('projects:read')
  taskGenerator(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('projectId') p: string, @Body() dto: GoalDto) {
    return this.ai.taskGenerator(o, w, p, dto.goal);
  }

  @Post('meeting-summary/:meetingId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('meetings:read')
  meetingSummary(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('meetingId') m: string) {
    return this.ai.meetingSummary(o, w, m);
  }

  @Post('client-email/:clientId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clients:read')
  clientEmail(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('clientId') c: string, @Body() dto: IntentDto) {
    return this.ai.clientEmailWriter(o, w, c, dto.intent, dto.tone);
  }

  @Post('proposal/:clientId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('clients:read')
  proposal(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('clientId') c: string, @Body() dto: ScopeDto) {
    return this.ai.proposalGenerator(o, w, c, dto.scope);
  }

  @Post('weekly-report')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('reports:read')
  weeklyReport(@Param('organizationId') o: string, @Param('workspaceId') w: string) {
    return this.ai.weeklyReport(o, w);
  }

  @Post('financial-summary')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('analytics:read')
  financialSummary(@Param('organizationId') o: string, @Param('workspaceId') w: string) {
    return this.ai.financialSummary(o, w);
  }

  @Post('search')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('reports:read')
  searchAssistant(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Body() dto: QueryDto) {
    return this.ai.searchAssistant(o, w, dto.query);
  }

  @Get('ask')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('analytics:read')
  naturalLanguageDashboard(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Query('query') query: string) {
    return this.ai.naturalLanguageDashboard(o, w, query);
  }
}
