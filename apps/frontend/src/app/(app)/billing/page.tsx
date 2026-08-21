'use client';

import { useState } from 'react';
import { CreditCard, Sparkles, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { ApiError, BillingOverview, PlanLimits } from '@/lib/types';

function fmtBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function Meter({ label, used, limit, fmt }: { label: string; used: number; limit: number | null; fmt: (n: number) => string }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / limit) * 100));
  const tone = limit !== null && pct >= 100 ? 'bg-danger' : limit !== null && pct >= 80 ? 'bg-warning' : 'bg-primary';
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {limit === null ? `${fmt(used)} · Unlimited` : `${fmt(used)} / ${fmt(limit)}`}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: limit === null ? '100%' : `${pct}%` }} />
      </div>
      {limit !== null && pct >= 100 ? <p className="mt-1 text-xs text-danger">Limit reached — upgrade to continue</p> : null}
    </div>
  );
}

export default function BillingPage() {
  const { activeOrgId, activeRole } = useAuth();
  const isOwner = activeRole === 'Owner';
  const base = activeOrgId ? `/organizations/${activeOrgId}/billing` : null;
  const { data, loading, reload } = useApi<BillingOverview>(base);
  const { data: plansData } = useApi<{ plans: PlanLimits[] }>(base ? `${base}/plans` : null);
  const plans = plansData?.plans ?? [];
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function choosePlan(plan: string) {
    if (!activeOrgId) return;
    setBusyPlan(plan); setErrMsg(null); setOkMsg(null);
    try {
      await apiFetch(`/organizations/${activeOrgId}/billing/plan`, { method: 'POST', body: JSON.stringify({ plan }) });
      setOkMsg(`Plan changed to ${plan.charAt(0) + plan.slice(1).toLowerCase()}.`);
      reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusyPlan(null); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & Plans"
        subtitle={data ? `You're on the ${data.limits.label} plan. Usage resets monthly.` : 'Manage your plan and usage.'}
      />

      {okMsg && <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-2.5 text-sm text-success">{okMsg}</div>}
      {errMsg && <div className="rounded-lg border border-danger/30 bg-danger-soft px-4 py-2.5 text-sm text-danger">{errMsg}</div>}

      {/* Current plan + usage */}
      <Card className="card-elevated">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><CreditCard className="h-4 w-4" /></div>
            <CardTitle className="text-base">Current plan</CardTitle>
          </div>
          {data && (
            <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
              {data.limits.label}{data.limits.priceMonthlyCents ? ` · ${formatCurrency(data.limits.priceMonthlyCents)}/mo` : data.limits.priceMonthlyCents === 0 ? ' · Free' : ''}
            </span>
          )}
        </CardHeader>
        <CardContent className="space-y-5">
          {loading || !data ? (
            <div className="space-y-4"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-6 w-2/3" /><Skeleton className="h-6 w-2/3" /></div>
          ) : (
            <>
              <Meter label="AI assistant runs (this month)" used={data.usage.aiCalls} limit={data.limits.maxAiCalls} fmt={(n) => String(n)} />
              <Meter label="File storage" used={Number(data.usage.storageBytes)} limit={data.limits.maxStorageBytes} fmt={fmtBytes} />
              <Meter label="Team members" used={data.memberCount} limit={data.limits.maxMembers} fmt={(n) => String(n)} />
              <p className="text-xs text-muted-foreground">Billing period started {new Date(data.usage.periodStart).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Plans grid */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><Sparkles className="h-4 w-4 text-primary" /> Choose a plan</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((p) => {
            const current = data?.plan === p.key;
            return (
              <Card key={p.key} className={cn('card-elevated relative flex flex-col', p.highlight && 'border-primary shadow-soft-lg', current && 'ring-2 ring-primary')}>
                {p.highlight ? <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">Most popular</span> : null}
                <CardContent className="flex flex-1 flex-col p-5">
                  <h3 className="font-semibold">{p.label}</h3>
                  <p className="text-xs text-muted-foreground">{p.tagline}</p>
                  <p className="mt-3 text-2xl font-bold">
                    {p.priceMonthlyCents === null ? 'Custom' : p.priceMonthlyCents === 0 ? 'Free' : formatCurrency(p.priceMonthlyCents)}
                    {p.priceMonthlyCents ? <span className="text-sm font-normal text-muted-foreground">/mo</span> : null}
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm">
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" />{p.maxMembers === null ? 'Unlimited members' : `${p.maxMembers} members`}</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" />{p.maxAiCalls === null ? 'Unlimited AI runs' : `${p.maxAiCalls} AI runs/mo`}</li>
                    <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" />{p.maxStorageBytes === null ? 'Unlimited storage' : `${fmtBytes(p.maxStorageBytes)} storage`}</li>
                  </ul>
                  {isOwner ? (
                    <Button className="mt-5 w-full" variant={current ? 'outline' : p.highlight ? 'default' : 'outline'} disabled={current || busyPlan === p.key} onClick={() => choosePlan(p.key)}>
                      {busyPlan === p.key ? <Loader2 className="h-4 w-4 animate-spin" /> : current ? 'Current plan' : p.key === 'ENTERPRISE' ? 'Contact sales' : 'Switch plan'}
                    </Button>
                  ) : (
                    <p className="mt-5 text-center text-xs text-muted-foreground">Only the Owner can change plans</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
