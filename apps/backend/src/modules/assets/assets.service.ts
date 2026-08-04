import { Injectable } from '@nestjs/common';
import type { Asset, AssetStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { EmployeesService } from '../employees/employees.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { CreateAssetDto, UpdateAssetDto, AssignAssetDto } from './dto/asset.dto';

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly employees: EmployeesService,
    private readonly audit: AuditService,
  ) {}

  async create(actorId: string, orgId: string, wsId: string, dto: CreateAssetDto): Promise<Asset> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const asset = await this.prisma.asset.create({
      data: {
        workspaceId: wsId,
        name: dto.name,
        serialNumber: dto.serialNumber,
        category: dto.category,
        valueCents: dto.valueCents ? BigInt(dto.valueCents) : null,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : null,
      },
    });
    this.audit.record({ actorId, organizationId: orgId, action: 'asset.create', targetType: 'asset', targetId: asset.id }).catch(() => undefined);
    return asset;
  }

  async list(orgId: string, wsId: string, pagination: PaginationDto, status?: AssetStatus): Promise<Paginated<Asset>> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const where = { workspaceId: wsId, ...(status ? { status } : {}) };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pagination.offset, take: pagination.size }),
      this.prisma.asset.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }

  async get(orgId: string, wsId: string, assetId: string): Promise<Asset> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const asset = await this.prisma.asset.findFirst({ where: { id: assetId, workspaceId: wsId } });
    if (!asset) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Asset not found');
    return asset;
  }

  async update(actorId: string, orgId: string, wsId: string, assetId: string, dto: UpdateAssetDto): Promise<Asset> {
    await this.get(orgId, wsId, assetId);
    return this.prisma.asset.update({
      where: { id: assetId },
      data: {
        ...dto,
        valueCents: dto.valueCents !== undefined ? BigInt(dto.valueCents) : undefined,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
      },
    });
  }

  async assign(actorId: string, orgId: string, wsId: string, assetId: string, dto: AssignAssetDto): Promise<Asset> {
    await this.get(orgId, wsId, assetId);
    const employeeId = dto.employeeId || null;
    if (employeeId) await this.employees.load(orgId, wsId, employeeId);
    return this.prisma.asset.update({
      where: { id: assetId },
      data: { assignedToEmployeeId: employeeId, status: employeeId ? 'ASSIGNED' : 'AVAILABLE' },
    });
  }

  async remove(actorId: string, orgId: string, wsId: string, assetId: string): Promise<{ deleted: true }> {
    await this.get(orgId, wsId, assetId);
    await this.prisma.asset.update({ where: { id: assetId }, data: { status: 'RETIRED', assignedToEmployeeId: null } });
    this.audit.record({ actorId, organizationId: orgId, action: 'asset.retire', targetType: 'asset', targetId: assetId }).catch(() => undefined);
    return { deleted: true };
  }
}
