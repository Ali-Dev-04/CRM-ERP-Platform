'use client';

import { useState } from 'react';
import { Megaphone, Plus, Send, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError, Announcement, Paginated } from '@/lib/types';

export default function AnnouncementsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const { data, loading, error, reload } = useApi<Paginated<Announcement>>(base ? `${base}/announcements?size=50` : null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [publish, setPublish] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!base) return;
    setBusy(true); setErrMsg(null);
    try {
      await apiFetch(`${base}/announcements`, { method: 'POST', body: JSON.stringify({ title: title.trim(), body: body.trim(), publish }) });
      setShowForm(false); setTitle(''); setBody(''); setPublish(false); reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }
  async function publishNow(a: Announcement) {
    if (!base) return;
    try { await apiFetch(`${base}/announcements/${a.id}/publish`, { method: 'PATCH' }); reload(); }
    catch (err) { setErrMsg((err as ApiError).message); }
  }
  async function remove(a: Announcement) {
    if (!base) return;
    try { await apiFetch(`${base}/announcements/${a.id}`, { method: 'DELETE' }); reload(); }
    catch (err) { setErrMsg((err as ApiError).message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" subtitle="Broadcast news to your workspace." actions={<Button onClick={() => { setTitle(''); setBody(''); setPublish(false); setErrMsg(null); setShowForm(true); }} className="gap-2"><Plus className="h-4 w-4" /> New announcement</Button>} />

      <Card className="card-elevated"><CardContent className="p-0">
        {loading ? <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        : error ? <p className="p-6 text-sm text-danger">{error.message}</p>
        : data && data.items.length > 0 ? (
          <ul className="divide-y divide-border">
            {data.items.map((a) => (
              <li key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="font-semibold">{a.title}</p><StatusPill status={a.publishedAt ? 'PUBLISHED' : 'DRAFT'} /></div>
                    <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDate(a.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!a.publishedAt ? <button onClick={() => publishNow(a)} title="Publish" className="rounded-md p-1.5 text-muted-foreground hover:bg-success-soft hover:text-success"><Send className="h-4 w-4" /></button> : null}
                    <button onClick={() => remove(a)} title="Delete" className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={<Megaphone className="h-5 w-5" />} title="No announcements" hint="Share news with your team." />}
      </CardContent></Card>
      {errMsg && <p className="text-sm text-danger">{errMsg}</p>}

      <Modal open={showForm} onClose={() => setShowForm(false)} title="New announcement">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="at">Title *</Label><Input id="at" required value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="ab">Body *</Label><textarea id="ab" required rows={4} value={body} onChange={(e) => setBody(e.target.value)} className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish immediately</label>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Saving…' : 'Create'}</Button></div>
        </form>
      </Modal>
    </div>
  );
}
