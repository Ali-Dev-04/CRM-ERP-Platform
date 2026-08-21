import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { DocumentsService } from '../documents/documents.service';
import { UsageService } from '../billing/usage.service';
import { S3Service } from '../../infrastructure/storage/s3.service';
import { NotFoundError, ValidationError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { PresignUploadDto } from './dto/file.dto';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly documents: DocumentsService,
    private readonly usage: UsageService,
    private readonly s3: S3Service,
  ) {}

  async presignUpload(actorId: string, orgId: string, wsId: string, dto: PresignUploadDto) {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    if (dto.sizeBytes > MAX_UPLOAD_BYTES) {
      throw new ValidationError(ErrorCodes.VALIDATION, `File exceeds the ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB limit`);
    }
    // Plan storage quota.
    await this.usage.assertStorageQuota(orgId, dto.sizeBytes);
    const storageKey = this.s3.createKey(wsId, dto.fileName);
    const document = await this.documents.register(actorId, orgId, wsId, {
      name: dto.fileName,
      storageKey,
      mimeType: dto.contentType,
      sizeBytes: dto.sizeBytes,
    });
    await this.usage.addStorage(orgId, dto.sizeBytes);
    const uploadUrl = await this.s3.presignUpload(storageKey, dto.contentType);
    return { document, uploadUrl };
  }

  async presignDownload(orgId: string, wsId: string, documentId: string): Promise<{ downloadUrl: string }> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, workspaceId: wsId } });
    if (!doc) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Document not found');
    const downloadUrl = await this.s3.presignDownload(doc.storageKey);
    return { downloadUrl };
  }
}
