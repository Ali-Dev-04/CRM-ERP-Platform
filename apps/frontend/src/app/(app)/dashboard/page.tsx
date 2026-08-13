'use client';

import { Users, FolderKanban, BadgeCheck, CheckCircle2, DollarSign, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyBarChart } from '@/components/charts/bar-chart';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';
import type { AnalyticsOverview, Task } from '@/lib/types';

interface RevenuePoint { month: string; totalCents: string }
interface Notif { id: string; title: string; message: string; readAt: string | null }

function Kpi({ icon: Icon, label, value, hint, tone }: { icon: React.ElementType; label: string; value: string; hint?: string; tone: string }) {
  return (
    <Card className="card-elevated overflow-hidden">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon className="h-5 w-5" /></div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {hint ? <p className="truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { activeOrgId, activeWorkspaceId, user, activeRole } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const isMember = activeRole === 'Member';

  // Manager data
  const { data, loading } = useApi<AnalyticsOverview>(!isMember && base ? `${base}/analytics/overview` : null);
  const { data: revenue } = useApi<RevenuePoint[]>(!isMember && base ? `${base}/reports/revenue?months=6` : null);
  // Member data
  const { data: myTasks } = useApi<Task[]>(isMember && base ? `${base}/me/tasks` : null);
  const { data: myNotifs } = useApi<Notif[]>(isMember ? '/notifications' : null);

  // ── Member: personal "My focus" view ──────────────────────────────────────
  if (isMember) {
    return (
      <div className="space-y-6">
        <PageHeader title={`Hi, ${user?.firstName ?? ''}`} subtitle="Here's what needs your attention." />
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="card-elevated">
            <CardHeader><CardTitle className="text-base">Your tasks</CardTitle></CardHeader>
            <CardContent>
              {myTasks ? (myTasks.length > 0 ? (
                <ul className="space-y-2">
                  {myTasks.map((t) => (
                    <li key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                      <div><p className="text-sm font-medium">{t.title}</p><p className="text-xs text-muted-foreground">{t.project?.name ?? '—'}</p></div>
                      <StatusPill status={t.status} />
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No tasks assigned" hint="Tasks assigned to you will appear here." />) : <Skeleton className="h-32" />}
            </CardContent>
          </Card>
          <Card className="card-elevated">
            <CardHeader><CardTitle className="text-base">Notifications</CardTitle></CardHeader>
            <CardContent>
              {myNotifs ? (myNotifs.length > 0 ? (
                <ul className="space-y-2">
                  {myNotifs.slice(0, 6).map((n) => (
                    <li key={n.id} className={`rounded-lg border border-border p-3 ${n.readAt ? 'opacity-60' : ''}`}>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.message}</p>
                    </li>
                  ))}
                </ul>
              ) : <EmptyState title="No notifications" />) : <Skeleton className="h-32" />}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Manager: org-wide KPI view ────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome back, ${user?.firstName ?? ''}`} subtitle="Here's what's happening across your workspace today." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : data ? (
          <>
            <Kpi icon={Users} label="Clients" value={String(data.counts.clients)} tone="bg-primary-soft text-primary" />
            <Kpi icon={FolderKanban} label="Active projects" value={String(data.counts.activeProjects)} tone="bg-info-soft text-info" />
            <Kpi icon={BadgeCheck} label="Employees" value={String(data.counts.employees)} tone="bg-success-soft text-success" />
            <Kpi icon={CheckCircle2} label="Task completion" value={`${data.tasks.completionRate}%`} hint={`${data.tasks.total} tasks total`} tone="bg-warning-soft text-warning" />
          </>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="card-elevated lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Collected revenue</CardTitle>
            <span className="text-xs text-muted-foreground">Last 6 months</span>
          </CardHeader>
          <CardContent>
            {revenue && revenue.length > 0 ? <MoneyBarChart data={revenue.map((r) => ({ label: r.month.slice(5), cents: r.totalCents }))} /> : <Skeleton className="h-[180px]" />}
          </CardContent>
        </Card>
        <div className="grid grid-cols-1 gap-4">
          <Card className="card-elevated"><CardContent className="flex items-center gap-4 p-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success-soft text-success"><DollarSign className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Revenue (paid)</p><p className="text-xl font-bold">{data ? formatCurrency(data.finance.revenuePaidCents) : '—'}</p></div></CardContent></Card>
          <Card className="card-elevated"><CardContent className="flex items-center gap-4 p-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-info"><Clock className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Outstanding</p><p className="text-xl font-bold">{data ? formatCurrency(data.finance.outstandingCents) : '—'}</p></div></CardContent></Card>
          <Card className="card-elevated"><CardContent className="flex items-center gap-4 p-5"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft text-danger"><AlertTriangle className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Overdue</p><p className="text-xl font-bold">{data ? formatCurrency(data.finance.overdueCents) : '—'}</p></div></CardContent></Card>
        </div>
      </div>

      <Card className="card-elevated">
        <CardHeader><CardTitle className="text-base">Tasks by status</CardTitle></CardHeader>
        <CardContent>
          {data ? (
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.tasks.byStatus).map(([status, n]) => (
                <span key={status} className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm">
                  <span className="capitalize text-muted-foreground">{status.replace(/_/g, ' ').toLowerCase()}</span>
                  <span className="font-semibold">{n as number}</span>
                </span>
              ))}
              {data.tasks.total === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
            </div>
          ) : <Skeleton className="h-8 w-2/3" />}
        </CardContent>
      </Card>
    </div>
  );
}
