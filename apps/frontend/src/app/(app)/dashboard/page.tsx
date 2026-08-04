'use client';

import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AnalyticsOverview } from '@/lib/types';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { activeOrgId, activeWorkspaceId, user } = useAuth();
  const path = wsPath(activeOrgId, activeWorkspaceId, '/analytics/overview');
  const { data, loading } = useApi<AnalyticsOverview>(path);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {user?.firstName}</h1>
        <p className="text-muted-foreground">Your workspace at a glance.</p>
      </div>

      {loading && <p className="text-muted-foreground">Loading metrics…</p>}
      {!loading && data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Clients" value={String(data.counts.clients)} />
            <Stat label="Active projects" value={String(data.counts.activeProjects)} />
            <Stat label="Employees" value={String(data.counts.employees)} />
            <Stat label="Task completion" value={`${data.tasks.completionRate}%`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Revenue (paid)" value={formatCurrency(data.finance.revenuePaidCents)} />
            <Stat label="Outstanding" value={formatCurrency(data.finance.outstandingCents)} />
            <Stat label="Overdue" value={formatCurrency(data.finance.overdueCents)} />
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Tasks by status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.tasks.byStatus).map(([status, n]) => (
                  <span key={status} className="rounded-md border px-3 py-1 text-sm">
                    {status.replace(/_/g, ' ').toLowerCase()}: <strong>{n as number}</strong>
                  </span>
                ))}
                {data.tasks.total === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
