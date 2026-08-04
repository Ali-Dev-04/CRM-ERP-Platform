import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { EmployeeStatus } from '@prisma/client';
import { EmployeesService } from './employees.service';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { RequirePermissions } from '../rbac/require-permissions.decorator';
import { PermissionsGuard } from '../rbac/permissions.guard';
import type { AuthUser } from '../../common/context/authenticated-request';

@ApiTags('employees')
@ApiBearerAuth()
@Controller('organizations/:organizationId/workspaces/:workspaceId/employees')
export class EmployeesController {
  constructor(private readonly employees: EmployeesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees:write')
  create(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Body() dto: CreateEmployeeDto) {
    return this.employees.create(req.user!.userId, o, w, dto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees:read')
  @ApiQuery({ name: 'status', required: false })
  list(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Query() p: PaginationDto, @Query('status') s?: EmployeeStatus) {
    return this.employees.list(o, w, p, s);
  }

  @Get(':employeeId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees:read')
  get(@Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('employeeId') id: string) {
    return this.employees.get(o, w, id);
  }

  @Patch(':employeeId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees:write')
  update(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('employeeId') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.employees.update(req.user!.userId, o, w, id, dto);
  }

  @Delete(':employeeId')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('employees:write')
  remove(@Req() req: Request & { user?: AuthUser }, @Param('organizationId') o: string, @Param('workspaceId') w: string, @Param('employeeId') id: string) {
    return this.employees.remove(req.user!.userId, o, w, id);
  }
}
