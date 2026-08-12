'use client';

import { useState } from 'react';
import { CalendarDays, ListTodo, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError } from '@/lib/types';

interface CalendarAgg {
  range: { from: string; to: string };
  meetings: { id: string; title: string; scheduledAt: string }[];
  tasks: { id: string; title: string; dueDate: string | null; project?: { name: string } }[];
}

function Section({ icon: Icon, title, children, empty }: { icon: React.ElementType; title: string; children: React.ReactNode; empty: string }) {
  return (
    <Card className="card-elevated">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children ?? <EmptyState title={empty} />}</CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const path = base ? `${base}/calendar` : null;
  const { data, loading, reload } = useApi<CalendarAgg>(path);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState('30');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  function openForm() {
    setTitle(''); setDuration('30');
    setWhen(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setErrMsg(null); setShowForm(true);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!base) return;
    setBusy(true); setErrMsg(null);
    try {
      await apiFetch(`${base}/meetings`, { method: 'POST', body: JSON.stringify({ title: title.trim(), scheduledAt: new Date(when).toISOString(), durationMinutes: Number(duration) || 30 }) });
      setShowForm(false); reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle={data ? `${formatDate(data.range.from)} → ${formatDate(data.range.to)}` : 'Upcoming meetings and tasks due.'}
        actions={<Button onClick={openForm} variant="outline" size="sm" className="gap-1.5"><Plus className="h-3.5 w-3.5" /> New meeting</Button>}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2"><Skeleton className="h-48" /><Skeleton className="h-48" /></div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Section icon={CalendarDays} title="Meetings" empty="No meetings scheduled.">
            {data && data.meetings.length > 0 ? (
              <ul className="space-y-2">
                {data.meetings.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium">{m.title}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(m.scheduledAt)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
          <Section icon={ListTodo} title="Tasks due" empty="No tasks due in this window.">
            {data && data.tasks.length > 0 ? (
              <ul className="space-y-2">
                {data.tasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <span className="text-sm font-medium">{t.title}{t.project ? <span className="ml-1 text-xs text-muted-foreground">· {t.project.name}</span> : null}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
        </div>
      )}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New meeting">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="mt">Title *</Label><Input id="mt" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="mw">When *</Label><Input id="mw" type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="md">Duration (min)</Label><Input id="md" type="number" min="5" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          </div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create meeting'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
