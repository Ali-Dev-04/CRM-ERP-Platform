import { Injectable } from '@nestjs/common';
import type { KnowledgeArticle } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';
import { toSlug } from '../../common/utils/slug';
import { CreateArticleDto, UpdateArticleDto } from './dto/knowledge.dto';

@Injectable()
export class KnowledgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly audit: AuditService,
  ) {}

  async create(actorId: string, orgId: string, wsId: string, dto: CreateArticleDto): Promise<KnowledgeArticle> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    return this.prisma.knowledgeArticle.create({
      data: {
        workspaceId: wsId,
        title: dto.title,
        slug: toSlug(dto.title),
        content: dto.content,
        category: dto.category,
        authorId: actorId,
        published: dto.publish ?? false,
        publishedAt: dto.publish ? new Date() : null,
      },
    });
  }

  async list(orgId: string, wsId: string, opts: { publishedOnly?: boolean; search?: string } = {}): Promise<KnowledgeArticle[]> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    return this.prisma.knowledgeArticle.findMany({
      where: {
        workspaceId: wsId,
        ...(opts.publishedOnly ? { published: true } : {}),
        ...(opts.search
          ? {
              OR: [
                { title: { contains: opts.search, mode: 'insensitive' as const } },
                { content: { contains: opts.search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }

  async get(orgId: string, wsId: string, articleId: string): Promise<KnowledgeArticle> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const a = await this.prisma.knowledgeArticle.findFirst({ where: { id: articleId, workspaceId: wsId } });
    if (!a) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Article not found');
    return a;
  }

  async update(actorId: string, orgId: string, wsId: string, articleId: string, dto: UpdateArticleDto): Promise<KnowledgeArticle> {
    await this.get(orgId, wsId, articleId);
    return this.prisma.knowledgeArticle.update({
      where: { id: articleId },
      data: {
        ...dto,
        publishedAt: dto.publish === true ? new Date() : undefined,
      },
    });
  }

  async remove(actorId: string, orgId: string, wsId: string, articleId: string): Promise<{ deleted: true }> {
    await this.get(orgId, wsId, articleId);
    await this.prisma.knowledgeArticle.delete({ where: { id: articleId } });
    this.audit.record({ actorId, organizationId: orgId, action: 'knowledge.delete', targetType: 'knowledge_article', targetId: articleId }).catch(() => undefined);
    return { deleted: true };
  }
}
