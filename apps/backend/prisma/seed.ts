/* eslint-disable no-console */
import {
  Prisma,
  PrismaClient,
  InvoiceStatus,
  ProjectStatus,
  TaskStatus,
  TaskPriority,
  ClientStatus,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import * as argon2 from 'argon2';
import { PERMISSIONS, SYSTEM_ROLES } from '../src/modules/rbac/permissions';

const prisma = new PrismaClient();

// ── date helpers ────────────────────────────────────────────────────────────
const DAY = 86_400_000;
const inDays = (n: number) => new Date(Date.now() + n * DAY);
const monthsAgo = (n: number) => new Date(Date.now() - n * 30 * DAY);

/**
 * Local-dev seed. Idempotent: safe to run repeatedly.
 *   1. RBAC catalog (system roles + permissions)
 *   2. Demo tenant (user, org, workspace, Owner membership)
 *   3. Demo data: clients, projects+tasks, invoices+payments, meetings,
 *      knowledge articles, notifications  →  feeds Projects, Invoices,
 *      Calendar, Knowledge, Notifications, and Analytics (computed).
 *
 *   login: demo@crm.dev / DemoPass12345
 */
async function main(): Promise<void> {
  // ── 1) RBAC catalog (idempotent) ──────────────────────────────────────────
  const perms: Record<string, { id: string }> = {};
  for (const key of PERMISSIONS) {
    perms[key] = await prisma.permission.upsert({ where: { key }, update: {}, create: { key } });
  }
  for (const def of Object.values(SYSTEM_ROLES)) {
    let role = await prisma.role.findFirst({
      where: { name: def.name, organizationId: null, isSystem: true },
    });
    if (!role) role = await prisma.role.create({ data: { name: def.name, organizationId: null, isSystem: true } });
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: def.permissions.map((k) => ({ roleId: role.id, permissionId: perms[k]!.id })),
      skipDuplicates: true,
    });
  }

  // ── 2) Demo tenant ────────────────────────────────────────────────────────
  const email = 'demo@crm.dev';
  const passwordHash = await argon2.hash('DemoPass12345', { type: argon2.argon2id });
  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: { email, passwordHash, firstName: 'Ada', lastName: 'Lovelace' },
  });

  const org = await prisma.organization.upsert({
    where: { slug: 'acme-inc' },
    update: { ownerId: user.id },
    create: { name: 'Acme Inc', slug: 'acme-inc', ownerId: user.id },
  });

  const ownerRole = await prisma.role.findFirstOrThrow({
    where: { name: 'Owner', organizationId: null, isSystem: true },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
    update: {},
    create: { userId: user.id, organizationId: org.id, roleId: ownerRole.id },
  });

  const workspace = await prisma.workspace.upsert({
    where: { organizationId_slug: { organizationId: org.id, slug: 'default' } },
    update: {},
    create: { organizationId: org.id, name: 'Default', slug: 'default' },
  });

  // ── 3) Demo data ──────────────────────────────────────────────────────────
  await seedClients(workspace.id, user.id);
  await seedProjectsAndTasks(workspace.id, user.id);
  await seedInvoicesAndPayments(workspace.id);
  await seedMeetings(workspace.id, user.id, org.id);
  await seedKnowledge(workspace.id, user.id);
  await seedNotifications(user.id, org.id);

  console.log(`\nSeed complete — login: ${email} / DemoPass12345  (org: ${org.slug})`);
}

// ── Clients ──────────────────────────────────────────────────────────────────
async function seedClients(workspaceId: string, userId: string) {
  const clients = [
    { name: 'Globex Corp', company: 'Globex', email: 'sales@globex.com', status: ClientStatus.ACTIVE },
    { name: 'Stark Industries', company: 'Stark', email: 'pepper@stark.com', status: ClientStatus.ACTIVE },
    { name: 'Wayne Enterprises', company: 'Wayne', email: 'lucius@wayne.com', status: ClientStatus.ACTIVE },
    { name: 'Umbra Labs', company: 'Umbra', email: 'hello@umbralabs.io', status: ClientStatus.INACTIVE },
  ];
  for (const c of clients) {
    const existing = await prisma.client.findFirst({ where: { workspaceId, email: c.email } });
    if (!existing) await prisma.client.create({ data: { ...c, workspaceId, createdById: userId } });
  }
}

// ── Projects + Tasks (tasks feed Calendar due dates + Analytics completion) ──
async function seedProjectsAndTasks(workspaceId: string, userId: string) {
  const ensureProject = async (name: string, status: ProjectStatus, description: string) => {
    let p = await prisma.project.findFirst({ where: { workspaceId, name } });
    if (!p) p = await prisma.project.create({ data: { workspaceId, name, description, status, createdById: userId } });
    return p;
  };

  const ensureTask = async (projectId: string, title: string, status: TaskStatus, priority: TaskPriority, due: Date | null) => {
    if (await prisma.task.findFirst({ where: { projectId, title } })) return;
    const pos = await prisma.task.count({ where: { projectId, status } });
    await prisma.task.create({
      data: { projectId, title, status, priority, position: pos, assigneeId: userId, dueDate: due },
    });
  };

  const website = await ensureProject('Website Redesign', ProjectStatus.ACTIVE, 'Refresh the marketing site with a new design system.');
  await ensureTask(website.id, 'Define requirements', TaskStatus.DONE, TaskPriority.HIGH, null);
  await ensureTask(website.id, 'Create wireframes', TaskStatus.IN_REVIEW, TaskPriority.MEDIUM, inDays(5));
  await ensureTask(website.id, 'Build homepage', TaskStatus.IN_PROGRESS, TaskPriority.HIGH, inDays(10));
  await ensureTask(website.id, 'Set up analytics', TaskStatus.TODO, TaskPriority.LOW, inDays(18));
  await ensureTask(website.id, 'Write copy', TaskStatus.TODO, TaskPriority.MEDIUM, inDays(2));

  const mobile = await ensureProject('Mobile App Launch', ProjectStatus.PLANNING, 'Launch the iOS and Android companion app.');
  await ensureTask(mobile.id, 'Market research', TaskStatus.DONE, TaskPriority.MEDIUM, null);
  await ensureTask(mobile.id, 'Choose tech stack', TaskStatus.IN_PROGRESS, TaskPriority.HIGH, null);
  await ensureTask(mobile.id, 'Design login flow', TaskStatus.TODO, TaskPriority.MEDIUM, inDays(7));
  await ensureTask(mobile.id, 'Build prototype', TaskStatus.TODO, TaskPriority.URGENT, inDays(12));
}

// ── Invoices + Payments (feed Analytics revenue/outstanding/overdue) ─────────
async function seedInvoicesAndPayments(workspaceId: string) {
  const clientByMail = async (mail: string) => prisma.client.findFirstOrThrow({ where: { workspaceId, email: mail } });

  const ensureInvoice = async (args: {
    clientEmail: string;
    number: string;
    status: InvoiceStatus;
    due: Date;
    lines: { description: string; qty: number; unit: number }[];
    issue?: Date;
  }) => {
    const client = await clientByMail(args.clientEmail);
    const computed = args.lines.map((l) => ({
      description: l.description,
      quantity: new Prisma.Decimal(l.qty),
      unitPriceCents: BigInt(l.unit),
      totalCents: BigInt(l.qty * l.unit),
    }));
    const subtotal = computed.reduce((s, l) => s + l.totalCents, 0n);
    const inv = await prisma.invoice.upsert({
      where: { workspaceId_number: { workspaceId, number: args.number } },
      update: {},
      create: {
        workspaceId,
        clientId: client.id,
        number: args.number,
        status: args.status,
        issueDate: args.issue ?? inDays(0),
        dueDate: args.due,
        subtotalCents: subtotal,
        discountCents: 0n,
        taxCents: 0n,
        totalCents: subtotal,
        currency: 'USD',
        lines: { create: computed },
      },
    });
    return inv;
  };

  const ensurePayment = async (invoiceId: string, amountCents: bigint, paidAt: Date) => {
    if (await prisma.payment.findFirst({ where: { invoiceId } })) return;
    const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
    await prisma.payment.create({
      data: { workspaceId: inv.workspaceId, invoiceId, amountCents, paidAt, method: PaymentMethod.BANK_TRANSFER, status: PaymentStatus.COMPLETED },
    });
  };

  // SENT — outstanding
  await ensureInvoice({
    clientEmail: 'pepper@stark.com', number: 'SEED-INV-001', status: InvoiceStatus.SENT, due: inDays(14),
    lines: [{ description: 'Consulting', qty: 24, unit: 20000 }, { description: 'Hosting setup', qty: 1, unit: 50000 }],
  });
  // PAID — revenue (paid ~2 months ago)
  const paid = await ensureInvoice({
    clientEmail: 'lucius@wayne.com', number: 'SEED-INV-002', status: InvoiceStatus.PAID, due: monthsAgo(1), issue: monthsAgo(2),
    lines: [{ description: 'Design', qty: 10, unit: 8000 }, { description: 'Development', qty: 20, unit: 12000 }],
  });
  await ensurePayment(paid.id, 320000n, monthsAgo(2));
  // PARTIALLY_PAID — half paid ~1 month ago (revenue + still outstanding)
  const partial = await ensureInvoice({
    clientEmail: 'sales@globex.com', number: 'SEED-INV-003', status: InvoiceStatus.PARTIALLY_PAID, due: inDays(7), issue: monthsAgo(1),
    lines: [{ description: 'Annual license', qty: 1, unit: 600000 }],
  });
  await ensurePayment(partial.id, 300000n, monthsAgo(1));
  // OVERDUE
  await ensureInvoice({
    clientEmail: 'pepper@stark.com', number: 'SEED-INV-004', status: InvoiceStatus.OVERDUE, due: inDays(-20), issue: monthsAgo(2),
    lines: [{ description: 'Support package', qty: 1, unit: 150000 }],
  });
  // DRAFT
  await ensureInvoice({
    clientEmail: 'lucius@wayne.com', number: 'SEED-INV-005', status: InvoiceStatus.DRAFT, due: inDays(30),
    lines: [{ description: 'Discovery workshop', qty: 1, unit: 90000 }],
  });
}

// ── Meetings (feed Calendar) ─────────────────────────────────────────────────
async function seedMeetings(workspaceId: string, userId: string, _orgId: string) {
  const ensureMeeting = async (title: string, when: Date, agenda: string) => {
    if (await prisma.meeting.findFirst({ where: { workspaceId, title } })) return;
    await prisma.meeting.create({
      data: {
        workspaceId,
        title,
        agenda,
        scheduledAt: when,
        durationMinutes: 30,
        createdById: userId,
        attendees: { create: [{ userId }] },
      },
    });
  };
  await ensureMeeting('Sprint planning', inDays(3), 'Plan the next two weeks of work.');
  await ensureMeeting('Client demo – Stark', inDays(6), 'Walk through the new dashboard.');
  await ensureMeeting('Design review', inDays(9), 'Review wireframes and brand colours.');
}

// ── Knowledge articles ───────────────────────────────────────────────────────
async function seedKnowledge(workspaceId: string, userId: string) {
  const ensureArticle = async (title: string, content: string, category: string, published: boolean) => {
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    await prisma.knowledgeArticle.upsert({
      where: { workspaceId_slug: { workspaceId, slug } },
      update: {},
      create: { workspaceId, title, slug, content, category, published, authorId: userId, publishedAt: published ? inDays(0) : null },
    });
  };
  await ensureArticle('Getting Started Guide', 'Welcome! Here is how to set up your first client, project, and invoice.', 'Onboarding', true);
  await ensureArticle('Refund Policy', 'Invoices can be cancelled while in DRAFT. Paid invoices require a refund payment record.', 'Billing', true);
  await ensureArticle('Roadmap 2026', 'Draft plan for Q3/Q4 features. Not published yet.', 'Internal', false);
}

// ── Notifications ────────────────────────────────────────────────────────────
async function seedNotifications(userId: string, orgId: string) {
  // Notifications are ephemeral — reset the demo user's to a known set.
  await prisma.notification.deleteMany({ where: { userId } });
  const items = [
    { type: 'invoice', title: 'Payment received', message: 'Invoice SEED-INV-002 (Wayne) was paid in full.', read: false, when: monthsAgo(2) },
    { type: 'task', title: 'New comment', message: "New comment on 'Build homepage'.", read: false, when: inDays(-1) },
    { type: 'welcome', title: 'Welcome to CRM+ERP', message: 'Your workspace is ready. Try creating a client!', read: true, when: monthsAgo(3) },
    { type: 'task', title: 'Task completed', message: "'Define requirements' was marked Done.", read: true, when: inDays(-3) },
  ];
  for (const n of items) {
    await prisma.notification.create({
      data: {
        userId,
        organizationId: orgId,
        type: n.type,
        title: n.title,
        message: n.message,
        readAt: n.read ? inDays(0) : null,
        createdAt: n.when,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
