'use client';

import { TrendingUp } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MoneyBarChart } from '@/components/charts/bar-chart';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';

interface RevenuePoint { month: string; totalCents: string }

export default function AnalyticsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const revPath = wsPath(activeOrgId, activeWorkspaceId, '/reports/revenue?months=6');
  const { data, loading } = useApi<RevenuePoint[]>(revPath);

  const total = data ? data.reduce((s, d) => s + Number(d.totalCents), 0) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Analytics" subtitle="Revenue collected over the last 6 months." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="card-elevated">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">6-month total</p>
            <p className="mt-1 text-2xl font-bold">{formatCurrency(total)}</p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Months with revenue</p>
            <p className="mt-1 text-2xl font-bold">{data ? data.filter((d) => Number(d.totalCents) > 0).length : 0}</p>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Best month</p>
            <p className="mt-1 text-2xl font-bold">
              {data && data.length > 0 ? formatCurrency(Math.max(...data.map((d) => Number(d.totalCents))) || 0) : '—'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="card-elevated">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Collected revenue</CardTitle>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" /> last 6 months
          </span>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[180px]" />
          ) : data && data.length > 0 ? (
            <MoneyBarChart data={data.map((d) => ({ label: d.month.slice(5), cents: d.totalCents }))} />
          ) : (
            <EmptyState icon={<TrendingUp className="h-5 w-5" />} title="No revenue recorded yet" hint="Record payments against invoices to see trends here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
