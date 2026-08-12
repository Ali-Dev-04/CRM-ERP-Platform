'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Check, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError, Employee, Leave, Paginated } from '@/lib/types';

const TYPES = ['ANNUAL', 'SICK', 'CASUAL', 'UNPAID', 'MATERNITY', 'PATERNITY'];

export default function LeavesPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const empApi = useApi<Paginated<Employee>>(base ? `${base}/employees?size=100` : null);
  const employees = useMemo(() => empApi.data?.items ?? [], [empApi.data]);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => { if (!selected && employees.length > 0) setSelected(employees[0]!.id); }, [employees, selected]);

  const leavesPath = selected && base ? `${base}/employees/${selected}/leaves?size=50` : null;
  const leavesApi = useApi<Paginated<Leave>>(leavesPath);
  const leaves = leavesApi.data?.items ?? [];

  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState('ANNUAL');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const emp = employees.find((e) => e.id === selected);

  function openForm() {
    setType('ANNUAL'); setStart(''); setEnd(''); setReason(''); setErrMsg(null); setShowForm(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!base || !selected) return;
    setBusy(true); setErrMsg(null);
    try {
      await apiFetch(`${base}/employees/${selected}/leaves`, { method: 'POST', body: JSON.stringify({ type, startDate: start, endDate: end, reason: reason.trim() || undefined }) });
      setShowForm(false); leavesApi.reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }
  async function review(l: Leave, status: 'APPROVED' | 'REJECTED') {
    if (!base) return;
    try { await apiFetch(`${base}/leaves/${l.id}/review`, { method: 'PATCH', body: JSON.stringify({ status }) }); leavesApi.reload(); }
    catch (err) { setErrMsg((err as ApiError).message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Leave requests" subtitle="Request and approve time off." actions={<Button onClick={openForm} className="gap-2" disabled={!selected}><Plus className="h-4 w-4" /> Request leave</Button>} />

      <Card className="card-elevated"><CardContent className="p-4">
        {empApi.loading ? <Skeleton className="h-10" /> : (
          <div className="space-y-1.5">
            <Label htmlFor="emp">Employee</Label>
            <select id="emp" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={selected ?? ''} onChange={(e) => setSelected(e.target.value)}>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
            </select>
          </div>
        )}
      </CardContent></Card>

      <Card className="card-elevated"><CardContent className="p-0">
        {leavesApi.loading ? <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        : leaves.length > 0 ? (
          <ul className="divide-y divide-border">
            {leaves.map((l) => (
              <li key={l.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {emp ? <Avatar name={`${emp.firstName} ${emp.lastName}`} size={36} /> : null}
                  <div>
                    <p className="text-sm font-medium capitalize">{l.type.toLowerCase()} leave · {formatDate(l.startDate)} → {formatDate(l.endDate)}</p>
                    <p className="text-xs text-muted-foreground">{l.reason ?? 'No reason given'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill status={l.status} />
                  {l.status === 'PENDING' ? (
                    <div className="flex gap-1">
                      <button onClick={() => review(l, 'APPROVED')} title="Approve" className="rounded-md p-1.5 text-muted-foreground hover:bg-success-soft hover:text-success"><Check className="h-4 w-4" /></button>
                      <button onClick={() => review(l, 'REJECTED')} title="Reject" className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"><X className="h-4 w-4" /></button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={<CalendarDays className="h-5 w-5" />} title="No leave requests" hint="Request time off using the button above." />}
      </CardContent></Card>
      {errMsg && <p className="text-sm text-danger">{errMsg}</p>}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Request leave" description={emp ? `For ${emp.firstName} ${emp.lastName}` : ''}>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="tp">Type</Label>
            <select id="tp" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t.toLowerCase()}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="sd">Start date *</Label><Input id="sd" type="date" required value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="ed">End date *</Label><Input id="ed" type="date" required value={end} onChange={(e) => setEnd(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label htmlFor="rs">Reason</Label><Input id="rs" value={reason} onChange={(e) => setReason(e.target.value)} /></div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit request'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
