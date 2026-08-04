import { Injectable } from '@nestjs/common';
import type { Employee, EmployeeStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError, ConflictError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { CreateEmployeeDto, UpdateEmployeeDto } from './dto/employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async create(actorId: string, orgId: string, wsId: string, dto: CreateEmployeeDto): Promise<Employee> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    try {
      const employee = await this.prisma.employee.create({
        data: {
          workspaceId: wsId,
          userId: dto.userId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          email: dto.email,
          jobTitle: dto.jobTitle,
          department: dto.department,
          hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
          status: dto.status ?? 'ACTIVE',
          salaryCents: dto.salaryCents ? BigInt(dto.salaryCents) : null,
          phone: dto.phone,
        },
      });
      this.audit.record({ actorId, organizationId: orgId, action: 'employee.create', targetType: 'employee', targetId: employee.id }).catch(() => undefined);
      return employee;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new ConflictError(ErrorCodes.CONFLICT, 'Employee email already exists in this workspace');
      }
      throw err;
    }
  }

  async list(orgId: string, wsId: string, pagination: PaginationDto, status?: EmployeeStatus): Promise<Paginated<Employee>> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const where = { workspaceId: wsId, deletedAt: null, ...(status ? { status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.employee.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pagination.offset, take: pagination.size }),
      this.prisma.employee.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }

  async get(orgId: string, wsId: string, employeeId: string): Promise<Employee> {
    return this.load(orgId, wsId, employeeId);
  }

  async update(actorId: string, orgId: string, wsId: string, employeeId: string, dto: UpdateEmployeeDto): Promise<Employee> {
    await this.load(orgId, wsId, employeeId);
    return this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...dto,
        hireDate: dto.hireDate ? new Date(dto.hireDate) : undefined,
        salaryCents: dto.salaryCents !== undefined ? BigInt(dto.salaryCents) : undefined,
      },
    });
  }

  async remove(actorId: string, orgId: string, wsId: string, employeeId: string): Promise<{ deleted: true }> {
    await this.load(orgId, wsId, employeeId);
    await this.prisma.employee.update({ where: { id: employeeId }, data: { deletedAt: new Date(), status: 'TERMINATED' } });
    this.audit.record({ actorId, organizationId: orgId, action: 'employee.terminate', targetType: 'employee', targetId: employeeId }).catch(() => undefined);
    return { deleted: true };
  }

  async load(orgId: string, wsId: string, employeeId: string): Promise<Employee> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const employee = await this.prisma.employee.findFirst({ where: { id: employeeId, workspaceId: wsId, deletedAt: null } });
    if (!employee) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Employee not found');
    return employee;
  }
}
