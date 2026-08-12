'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderKanban, Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError, Paginated, Project, Task } from '@/lib/types';

const COLUMNS: { key: Task['status']; label: string; dot: string }[] = [
  { key: 'TODO', label: 'To do', dot: 'bg-muted-foreground' },
  { key: 'IN_PROGRESS', label: 'In progress', dot: 'bg-info' },
  { key: 'IN_REVIEW', label: 'In review', dot: 'bg-warning' },
  { key: 'BLOCKED', label: 'Blocked', dot: 'bg-danger' },
  { key: 'DONE', label: 'Done', dot: 'bg-success' },
];

export default function ProjectsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const projectsApi = useApi<Paginated<Project>>(base ? `${base}/projects?size=50` : null);
  const projects = useMemo(() => projectsApi.data?.items ?? [], [projectsApi.data]);

  const [selected, setSelected] = useState<string | null>(null);
  const tasksPath = selected && base ? `${base}/projects/${selected}/tasks` : null;
  const tasksApi = useApi<Task[]>(tasksPath);

  // project modal
  const [showProject, setShowProject] = useState(false);
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');
  // task modal
  const [showTask, setShowTask] = useState(false);
  const [tTitle, setTTitle] = useState('');
  const [tPriority, setTPriority] = useState('MEDIUM');
  const [tStatus, setTStatus] = useState('TODO');
  const [deleting, setDeleting] = useState<Task | null>(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && projects.length > 0) setSelected(projects[0]!.id);
  }, [projects, selected]);

  const byColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const t of tasksApi.data ?? []) (map[t.status] ??= []).push(t);
    return map;
  }, [tasksApi.data]);

  function colIndex(status: string) {
    return Math.max(0, COLUMNS.findIndex((c) => c.key === status));
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!base) return;
    setBusy(true); setErrMsg(null);
    try {
      const p = await apiFetch<Project>(`${base}/projects`, { method: 'POST', body: JSON.stringify({ name: pName.trim(), description: pDesc.trim() || undefined }) });
      setShowProject(false); setPName(''); setPDesc('');
      projectsApi.reload();
      setSelected(p.id);
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  function openTask() {
    setTTitle(''); setTPriority('MEDIUM'); setTStatus('TODO'); setErrMsg(null); setShowTask(true);
  }
  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!base || !selected) return;
    setBusy(true); setErrMsg(null);
    try {
      await apiFetch(`${base}/projects/${selected}/tasks`, { method: 'POST', body: JSON.stringify({ title: tTitle.trim(), priority: tPriority, status: tStatus }) });
      setShowTask(false);
      tasksApi.reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  async function move(t: Task, dir: -1 | 1) {
    if (!base || !selected) return;
    const idx = Math.min(Math.max(colIndex(t.status) + dir, 0), COLUMNS.length - 1);
    const target = COLUMNS[idx]!.key;
    if (target === t.status) return;
    try {
      await apiFetch(`${base}/projects/${selected}/tasks/${t.id}/move`, { method: 'PATCH', body: JSON.stringify({ status: target, index: 999 }) });
      tasksApi.reload();
    } catch (err) { setErrMsg((err as ApiError).message); }
  }

  async function confirmDelete() {
    if (!base || !selected || !deleting) return;
    setBusy(true);
    try {
      await apiFetch(`${base}/projects/${selected}/tasks/${deleting.id}`, { method: 'DELETE' });
      setDeleting(null);
      tasksApi.reload();
    } catch (err) { setErrMsg((err as ApiError).message); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="Plan work and move tasks across the board."
        actions={<Button onClick={() => { setPName(''); setPDesc(''); setErrMsg(null); setShowProject(true); }} className="gap-2"><Plus className="h-4 w-4" /> New project</Button>}
      />

      {projects.length === 0 ? (
        <Card className="card-elevated"><CardContent className="p-0"><EmptyState icon={<FolderKanban className="h-5 w-5" />} title="No projects yet" hint="Create a project to start organising tasks." /></CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const active = selected === p.id;
            return (
              <button key={p.id} onClick={() => setSelected(p.id)} className={cn('rounded-xl border p-4 text-left transition-all', active ? 'border-primary bg-primary-soft shadow-soft' : 'border-border bg-card hover:border-primary/40 hover:shadow-sm')}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.name}</span>
                  <span className={cn('h-2.5 w-2.5 rounded-full', active ? 'bg-primary' : 'bg-muted-foreground/30')} />
                </div>
                {p.description ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.description}</p> : null}
                <div className="mt-3"><StatusPill status={p.status} /></div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Board</h2>
            <Button onClick={openTask} variant="outline" size="sm" className="gap-1"><Plus className="h-3.5 w-3.5" /> New task</Button>
          </div>
          {tasksApi.loading ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">{COLUMNS.map((c) => <Skeleton key={c.key} className="h-40" />)}</div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
              {COLUMNS.map((col, ci) => (
                <div key={col.key} className="rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold"><span className={cn('h-2 w-2 rounded-full', col.dot)} />{col.label}</span>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">{byColumn[col.key]?.length ?? 0}</span>
                  </div>
                  <div className="space-y-2 p-2">
                    {(byColumn[col.key] ?? []).map((t) => (
                      <div key={t.id} className="group rounded-lg border border-border bg-card p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">{t.title}</p>
                          <button onClick={() => setDeleting(t)} className="rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100" aria-label="Delete task"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <StatusPill status={t.priority} />
                          <div className="flex">
                            <button onClick={() => move(t, -1)} disabled={ci === 0} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Move left"><ChevronLeft className="h-3.5 w-3.5" /></button>
                            <button onClick={() => move(t, 1)} disabled={ci === COLUMNS.length - 1} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30" aria-label="Move right"><ChevronRight className="h-3.5 w-3.5" /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(byColumn[col.key]?.length ?? 0) === 0 && (
                      <div className="flex items-center justify-center rounded-lg border border-dashed border-border/70 py-4 text-xs text-muted-foreground">Empty</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {errMsg && <p className="text-sm text-danger">{errMsg}</p>}

      {/* New project modal */}
      <Modal open={showProject} onClose={() => setShowProject(false)} title="New project" description="Create a project to group tasks.">
        <form onSubmit={createProject} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="pn">Name *</Label><Input id="pn" required value={pName} onChange={(e) => setPName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label htmlFor="pd">Description</Label><Input id="pd" value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowProject(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create project'}</Button></div>
        </form>
      </Modal>

      {/* New task modal */}
      <Modal open={showTask} onClose={() => setShowTask(false)} title="New task" description={`Add a task to: ${projects.find((p) => p.id === selected)?.name ?? ''}`}>
        <form onSubmit={createTask} className="space-y-4">
          <div className="space-y-1.5"><Label htmlFor="tt">Title *</Label><Input id="tt" required value={tTitle} onChange={(e) => setTTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="tp">Priority</Label>
              <select id="tp" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={tPriority} onChange={(e) => setTPriority(e.target.value)}>
                {['LOW', 'MEDIUM', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p.toLowerCase()}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label htmlFor="ts">Column</Label>
              <select id="ts" className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={tStatus} onChange={(e) => setTStatus(e.target.value)}>
                {COLUMNS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
            </div>
          </div>
          {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowTask(false)}>Cancel</Button><Button type="submit" disabled={busy}>{busy ? 'Adding…' : 'Add task'}</Button></div>
        </form>
      </Modal>

      {/* Delete task confirm */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete task" size="sm">
        <p className="text-sm text-muted-foreground">Delete <span className="font-medium text-foreground">{deleting?.title}</span>?</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete} disabled={busy}>{busy ? 'Deleting…' : 'Delete'}</Button></div>
      </Modal>
    </div>
  );
}
