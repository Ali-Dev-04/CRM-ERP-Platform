import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Attendance, AttendanceStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { EmployeesService } from '../employees/employees.service';
import { AuditService } from '../audit/audit.service';
import { ConflictError, NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly employees: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  async clockIn(actorId: string, orgId: string, wsId: string, employeeId: string, status: AttendanceStatus = 'PRESENT'): Promise<Attendance> {
    await this.employees.load(orgId, wsId, employeeId);
    const today = startOfDay(new Date());
    try {
      const record = await this.prisma.attendance.create({
        data: { employeeId, date: today, clockIn: new Date(), status },
      });
      this.audit.record({ actorId, organizationId: orgId, action: 'attendance.clock_in', targetType: 'attendance', targetId: record.id }).catch(() => undefined);
      return record;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError(ErrorCodes.CONFLICT, 'Already clocked in today');
      }
      throw err;
    }
  }

  async clockOut(actorId: string, orgId: string, wsId: string, employeeId: string): Promise<Attendance> {
    await this.employees.load(orgId, wsId, employeeId);
    const today = startOfDay(new Date());
    const record = await this.prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date: today } } });
    if (!record) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'No clock-in record for today');
    if (record.clockOut) throw new ConflictError(ErrorCodes.CONFLICT, 'Already clocked out today');
    const now = new Date();
    const workMinutes = Math.round((now.getTime() - (record.clockIn ?? now).getTime()) / 60_000);
    const updated = await this.prisma.attendance.update({ where: { id: record.id }, data: { clockOut: now, workMinutes } });
    this.audit.record({ actorId, organizationId: orgId, action: 'attendance.clock_out', targetType: 'attendance', targetId: record.id }).catch(() => undefined);
    return updated;
  }

  async listByEmployee(orgId: string, wsId: string, employeeId: string, pagination: PaginationDto): Promise<Paginated<Attendance>> {
    await this.employees.load(orgId, wsId, employeeId);
    const where = { employeeId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({ where, orderBy: { date: 'desc' }, skip: pagination.offset, take: pagination.size }),
      this.prisma.attendance.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }
}
