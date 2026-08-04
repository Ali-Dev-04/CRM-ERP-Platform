import { Injectable } from '@nestjs/common';
import type { Document } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PaginationDto } from '../../common/pagination/pagination.dto';
import { Paginated } from '../../common/pagination/paginated';

export interface CreateDocumentInput {
  name: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}

/**
 * Document *metadata*. The bytes live in S3 (M5 wires presigned uploads); here
 * we record the workspace-scoped pointer + audit the upload. Keeping the blob
 * out of Postgres is deliberate — never store file bytes in the DB.
 */
@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async register(actorId: string, orgId: string, wsId: string, input: CreateDocumentInput): Promise<Document> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const doc = await this.prisma.document.create({
      data: { workspaceId: wsId, name: input.name, storageKey: input.storageKey, mimeType: input.mimeType, sizeBytes: BigInt(input.sizeBytes), uploadedById: actorId },
    });
    this.audit.record({ actorId, organizationId: orgId, action: 'document.register', targetType: 'document', targetId: doc.id, metadata: { storageKey: input.storageKey } }).catch(() => undefined);
    return doc;
  }

  async list(orgId: string, wsId: string, pagination: PaginationDto): Promise<Paginated<Document>> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const where = { workspaceId: wsId };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.document.findMany({ where, orderBy: { createdAt: 'desc' }, skip: pagination.offset, take: pagination.size }),
      this.prisma.document.count({ where }),
    ]);
    return new Paginated(items, total, pagination);
  }

  async remove(actorId: string, orgId: string, wsId: string, documentId: string): Promise<{ deleted: true }> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, workspaceId: wsId } });
    if (!doc) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Document not found');
    // NOTE: the caller (M5 file service) is responsible for deleting the S3 object.
    await this.prisma.document.delete({ where: { id: documentId } });
    this.audit.record({ actorId, organizationId: orgId, action: 'document.delete', targetType: 'document', targetId: documentId }).catch(() => undefined);
    return { deleted: true };
  }
}
