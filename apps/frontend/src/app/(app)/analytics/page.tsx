'use client';

import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RevenuePoint { month: string; totalCents: string }

export default function AnalyticsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const revPath = wsPath(activeOrgId, activeWorkspaceId, '/reports/revenue?months=6');
  const { data, loading } = useApi<RevenuePoint[]>(revPath);

  const max = data && data.length > 0 ? Math.max(...data.map((d) => Number(d.totalCents)), 1) : 1;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <Card>
        <CardHeader>
          <CardTitle>Collected revenue (last 6 months)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {data && data.length === 0 && <p className="text-sm text-muted-foreground">No payments collected in this window.</p>}
          <div className="space-y-3">
            {data?.map((d) => (
              <div key={d.month}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium">{d.month}</span>
                  <span className="text-muted-foreground">{formatCurrency(d.totalCents)}</span>
                </div>
                <div className="h-3 w-full rounded bg-muted">
                  <div
                    className="h-3 rounded bg-primary"
                    style={{ width: `${(Number(d.totalCents) / max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
