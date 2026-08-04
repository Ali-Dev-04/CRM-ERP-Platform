import { Injectable } from '@nestjs/common';
import type { Leave, LeaveStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmployeesService } from '../employees/employees.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError, ValidationError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { CreateLeaveDto, ReviewLeaveDto } from './dto/leave.dto';

@Injectable()
export class LeavesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employees: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  async request(actorId: string, orgId: string, wsId: string, employeeId: string, dto: CreateLeaveDto): Promise<Leave> {
    await this.employees.load(orgId, wsId, employeeId);
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    if (end < start) throw new ValidationError(ErrorCodes.VALIDATION, 'End date must not precede start date');
    const leave = await this.prisma.leave.create({
      data: { employeeId, type: dto.type, startDate: start, endDate: end, reason: dto.reason, status: 'PENDING' },
    });
    this.audit.record({ actorId, organizationId: orgId, action: 'leave.request', targetType: 'leave', targetId: leave.id }).catch(() => undefined);
    return leave;
  }

  async review(actorId: string, orgId: string, wsId: string, leaveId: string, dto: ReviewLeaveDto): Promise<Leave> {
    const leave = await this.prisma.leave.findUnique({ where: { id: leaveId }, include: { employee: true } });
    if (!leave || leave.employee.workspaceId !== wsId) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Leave not found');
    await this.employees.load(orgId, wsId, leave.employeeId);
    if (leave.status !== 'PENDING') {
      throw new ValidationError(ErrorCodes.VALIDATION, `Leave already ${leave.status}`);
    }
    const updated = await this.prisma.leave.update({
      where: { id: leaveId },
      data: { status: dto.status, approverId: actorId, approvedAt: new Date() },
    });
    this.audit.record({ actorId, organizationId: orgId, action: 'leave.review', targetType: 'leave', targetId: leaveId, metadata: { status: dto.status } }).catch(() => undefined);
    return updated;
  }

  async listByEmployee(orgId: string, wsId: string, employeeId: string, pagination: PaginationDto, status?: LeaveStatus): Promise<Paginated<Leave>> {
    await this.employees.load(orgId, wsId, employeeId);
    const where = { employeeId, ...(status ? { status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.leave.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pagination.offset, take: pagination.size }),
      this.prisma.leave.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }
}
