import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { UsageService } from '../billing/usage.service';
import { AiGateway, type AiResult } from './ai.gateway';
import { NotFoundError } from '../../common/exceptions/domain.exception';
import { ErrorCodes } from '../../common/exceptions/error-codes';

const SYSTEM = (role: string) =>
  `You are the ${role} for an enterprise CRM+ERP. Be concise, structured, and actionable. Use markdown.`;

/**
 * Nine AI features. Each grounds the model in REAL workspace data (loaded via
 * Prisma) before prompting — no hallucinated entities. Output is returned with
 * the model name and a `mocked` flag (true when no provider is configured).
 */
@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizations: OrganizationsService,
    private readonly usage: UsageService,
    private readonly ai: AiGateway,
  ) {}

  /**
   * Quota-metered AI execution: every feature runs through here, so AI usage
   * is checked against the org's plan and recorded in one place.
   */
  private async runAi(organizationId: string, system: string, prompt: string): Promise<AiResult> {
    await this.usage.assertAiQuota(organizationId);
    const result = await this.ai.chat(system, prompt);
    await this.usage.recordAiCall(organizationId);
    return result;
  }

  // 1) AI Project Manager — health, risks, next actions for a project.
  async projectManager(orgId: string, wsId: string, projectId: string): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, workspaceId: wsId }, include: { tasks: true } });
    if (!project) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Project not found');
    const byStatus = this.group(project.tasks, 'status');
    return this.runAi(orgId, 
      SYSTEM('AI Project Manager'),
      `Project: ${project.name} (${project.status})\nTasks by status: ${JSON.stringify(byStatus)}\nTotal tasks: ${project.tasks.length}.\nAssess project health, flag risks, and recommend the top 3 next actions.`,
    );
  }

  // 2) AI Task Generator — suggest tasks from a goal.
  async taskGenerator(orgId: string, wsId: string, projectId: string, goal: string): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const project = await this.prisma.project.findFirst({ where: { id: projectId, workspaceId: wsId }, select: { name: true, description: true } });
    if (!project) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Project not found');
    return this.runAi(orgId, 
      SYSTEM('AI Task Planner'),
      `Project: ${project.name}. Description: ${project.description ?? 'n/a'}.\nGoal: ${goal}\nPropose 5–8 concrete tasks (title + one-line description + suggested priority LOW/MEDIUM/HIGH/URGENT).`,
    );
  }

  // 3) AI Meeting Summary.
  async meetingSummary(orgId: string, wsId: string, meetingId: string): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const m = await this.prisma.meeting.findFirst({ where: { id: meetingId, workspaceId: wsId } });
    if (!m) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Meeting not found');
    return this.runAi(orgId, 
      SYSTEM('AI Meeting Notes Assistant'),
      `Meeting: ${m.title}\nAgenda: ${m.agenda ?? 'n/a'}\nNotes: ${m.notes ?? 'n/a'}\nSummarize key decisions, action items (with owners if mentioned), and open questions.`,
    );
  }

  // 4) AI Client Email Writer.
  async clientEmailWriter(orgId: string, wsId: string, clientId: string, intent: string, tone = 'professional'): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const client = await this.prisma.client.findFirst({ where: { id: clientId, workspaceId: wsId } });
    if (!client) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Client not found');
    return this.runAi(orgId, 
      SYSTEM('AI Client Communications Assistant'),
      `Client: ${client.name} (${client.company ?? 'n/a'}, ${client.email ?? 'no email'}).\nIntent: ${intent}. Tone: ${tone}.\nWrite a ready-to-send email. Include subject line.`,
    );
  }

  // 5) AI Proposal Generator.
  async proposalGenerator(orgId: string, wsId: string, clientId: string, scope: string): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const client = await this.prisma.client.findFirst({ where: { id: clientId, workspaceId: wsId } });
    if (!client) throw new NotFoundError(ErrorCodes.NOT_FOUND, 'Client not found');
    return this.runAi(orgId, 
      SYSTEM('AI Proposal Writer'),
      `Client: ${client.name} (${client.company ?? 'n/a'}).\nScope of work: ${scope}\nDraft a proposal with: objectives, deliverables, timeline, and a placeholder pricing section.`,
    );
  }

  // 6) AI Weekly Report.
  async weeklyReport(orgId: string, wsId: string): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [tasks, invoices, payments] = await Promise.all([
      this.prisma.task.findMany({ where: { project: { workspaceId: wsId }, updatedAt: { gte: since } }, select: { status: true, title: true } }),
      this.prisma.invoice.findMany({ where: { workspaceId: wsId, createdAt: { gte: since } }, select: { number: true, status: true, totalCents: true } }),
      this.prisma.payment.findMany({ where: { workspaceId: wsId, paidAt: { gte: since } }, select: { amountCents: true } }),
    ]);
    const collected = payments.reduce((s, p) => s + Number(p.amountCents), 0);
    return this.runAi(orgId, 
      SYSTEM('AI Weekly Reporter'),
      `This week — tasks touched: ${JSON.stringify(this.group(tasks, 'status'))} (${tasks.length}); new invoices: ${invoices.length}; collected payments: ${collected} cents.\nWrite a concise executive weekly summary: progress, blockers, financials.`,
    );
  }

  // 7) AI Financial Summary.
  async financialSummary(orgId: string, wsId: string): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const agg = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { workspaceId: wsId },
      _sum: { totalCents: true },
      _count: { _all: true },
    });
    return this.runAi(orgId, 
      SYSTEM('AI Financial Analyst'),
      `Invoices by status: ${JSON.stringify(agg.map((a) => ({ status: a.status, count: a._count._all, totalCents: a._sum.totalCents?.toString() })))}.\nSummarize receivables health: outstanding exposure, paid performance, and 2–3 recommendations (e.g. chase overdue).`,
    );
  }

  // 8) AI Search Assistant — answer a question grounded in workspace data.
  async searchAssistant(orgId: string, wsId: string, query: string): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const [clients, projects, articles] = await Promise.all([
      this.prisma.client.findMany({ where: { workspaceId: wsId, deletedAt: null }, select: { name: true, company: true, email: true, status: true }, take: 50 }),
      this.prisma.project.findMany({ where: { workspaceId: wsId, deletedAt: null }, select: { name: true, status: true }, take: 50 }),
      this.prisma.knowledgeArticle.findMany({ where: { workspaceId: wsId }, select: { title: true, category: true }, take: 30 }),
    ]);
    return this.runAi(orgId, 
      SYSTEM('AI Workspace Search Assistant'),
      `Workspace index — clients: ${JSON.stringify(clients)}; projects: ${JSON.stringify(projects)}; knowledge: ${JSON.stringify(articles)}.\nQuestion: ${query}\nAnswer using ONLY the provided index; cite which entity matches.`,
    );
  }

  // 9) Natural Language Dashboard Queries — interpret a question over KPIs.
  async naturalLanguageDashboard(orgId: string, wsId: string, query: string): Promise<AiResult> {
    await this.organizations.assertWorkspaceInOrg(wsId, orgId);
    const [clients, projects, employees, invoiceAgg, paymentAgg] = await Promise.all([
      this.prisma.client.count({ where: { workspaceId: wsId, deletedAt: null } }),
      this.prisma.project.count({ where: { workspaceId: wsId, deletedAt: null, status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { workspaceId: wsId, deletedAt: null } }),
      this.prisma.invoice.aggregate({ where: { workspaceId: wsId, status: 'PAID' }, _sum: { totalCents: true } }),
      this.prisma.payment.aggregate({ where: { workspaceId: wsId, status: 'COMPLETED' }, _sum: { amountCents: true } }),
    ]);
    const kpis = {
      clients,
      activeProjects: projects,
      employees,
      revenuePaidCents: (invoiceAgg._sum.totalCents ?? 0n).toString(),
      collectedPaymentsCents: (paymentAgg._sum.amountCents ?? 0n).toString(),
    };
    return this.runAi(orgId, 
      SYSTEM('AI Analytics Assistant'),
      `Current KPIs: ${JSON.stringify(kpis)}.\nQuestion: ${query}\nAnswer in plain language using these KPIs; if the answer isn't derivable, say so.`,
    );
  }

  private group<T extends Record<string, unknown>>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((acc: Record<string, number>, item) => {
      const k = String(item[key]);
      acc[k] = (acc[k] ?? 0) + 1;
      return acc;
    }, {});
  }
}
