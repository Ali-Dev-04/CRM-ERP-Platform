import { Injectable } from '@nestjs/common';
import type { Client, ClientStatus } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';
import { CreateClientDto, UpdateClientDto } from './dto/client.dto';
import { toClientView, type ClientView } from './client.view';

/**
 * Workspace-scoped client management. Every method asserts the workspace
 * belongs to the caller's organization first, then operates strictly within
 * that workspace — the workspace filter is the tenant boundary for CRM data.
 */
@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async create(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    dto: CreateClientDto,
  ): Promise<ClientView> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const client = await this.prisma.client.create({
      data: { ...dto, workspaceId, createdById: actorId },
    });
    this.audit
      .record({
        actorId,
        organizationId,
        action: 'client.create',
        targetType: 'client',
        targetId: client.id,
        metadata: { name: client.name },
      })
      .catch(() => undefined);
    return toClientView(client);
  }

  async list(
    organizationId: string,
    workspaceId: string,
    pagination: PaginationDto,
    status?: ClientStatus,
    search?: string,
  ): Promise<Paginated<ClientView>> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const where = {
      workspaceId,
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' as const } } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: pagination.offset,
        take: pagination.size,
      }),
      this.prisma.client.count({ where }),
    ]);
    return new Paginated(items.map(toClientView), total, pagination);
  }

  async get(organizationId: string, workspaceId: string, clientId: string): Promise<ClientView> {
    return toClientView(await this.load(organizationId, workspaceId, clientId));
  }

  async update(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    clientId: string,
    dto: UpdateClientDto,
  ): Promise<ClientView> {
    await this.load(organizationId, workspaceId, clientId);
    const client = await this.prisma.client.update({
      where: { id: clientId },
      data: dto,
    });
    this.audit
      .record({
        actorId,
        organizationId,
        action: 'client.update',
        targetType: 'client',
        targetId: client.id,
      })
      .catch(() => undefined);
    return toClientView(client);
  }

  async remove(
    actorId: string,
    organizationId: string,
    workspaceId: string,
    clientId: string,
  ): Promise<{ deleted: true }> {
    await this.load(organizationId, workspaceId, clientId);
    await this.prisma.client.update({ where: { id: clientId }, data: { deletedAt: new Date() } });
    this.audit
      .record({
        actorId,
        organizationId,
        action: 'client.delete',
        targetType: 'client',
        targetId: clientId,
      })
      .catch(() => undefined);
    return { deleted: true };
  }

  private async load(
    organizationId: string,
    workspaceId: string,
    clientId: string,
  ): Promise<Client> {
    await this.organizations.assertWorkspaceInOrg(workspaceId, organizationId);
    const client = await this.prisma.client.findFirst({
      where: { id: clientId, workspaceId, deletedAt: null },
    });
    if (!client) {
      throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Client not found');
    }
    return client;
  }
}
