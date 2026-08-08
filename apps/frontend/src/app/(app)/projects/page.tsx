'use client';

import { useEffect, useMemo, useState } from 'react';
import { FolderKanban, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';
import type { Paginated, Project, Task } from '@/lib/types';

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
  const { data: projectsData } = useApi<Paginated<Project>>(base ? `${base}/projects?size=50` : null);
  const projects = useMemo(() => projectsData?.items ?? [], [projectsData]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && projects.length > 0) setSelected(projects[0]!.id);
  }, [projects, selected]);

  const tasksPath = selected && base ? `${base}/projects/${selected}/tasks` : null;
  const { data: tasks, loading } = useApi<Task[]>(tasksPath);

  const byColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const t of tasks ?? []) (map[t.status] ??= []).push(t);
    return map;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" subtitle="Plan work and move tasks across the board." />

      {/* Project picker */}
      {projects.length === 0 ? (
        <Card className="card-elevated">
          <CardContent className="p-0">
            <EmptyState icon={<FolderKanban className="h-5 w-5" />} title="No projects yet" hint="Create a project to start organising tasks." />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const active = selected === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelected(p.id)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  active ? 'border-primary bg-primary-soft shadow-soft' : 'border-border bg-card hover:border-primary/40 hover:shadow-sm',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{p.name}</span>
                  <span className={cn('h-2.5 w-2.5 rounded-full', active ? 'bg-primary' : 'bg-muted-foreground/30')} />
                </div>
                <div className="mt-3"><StatusPill status={p.status} /></div>
              </button>
            );
          })}
        </div>
      )}

      {/* Board */}
      {selected && (
        <div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
              {COLUMNS.map((c) => (
                <Skeleton key={c.key} className="h-40" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
              {COLUMNS.map((col) => (
                <div key={col.key} className="rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <span className={cn('h-2 w-2 rounded-full', col.dot)} />
                      {col.label}
                    </span>
                    <span className="rounded-full bg-card px-2 py-0.5 text-xs text-muted-foreground">
                      {byColumn[col.key]?.length ?? 0}
                    </span>
                  </div>
                  <div className="space-y-2 p-2">
                    {(byColumn[col.key] ?? []).map((t) => (
                      <div key={t.id} className="rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
                        <p className="text-sm font-medium leading-snug">{t.title}</p>
                        <div className="mt-2"><StatusPill status={t.priority} /></div>
                      </div>
                    ))}
                    {(byColumn[col.key]?.length ?? 0) === 0 && (
                      <div className="flex items-center justify-center rounded-lg border border-dashed border-border/70 py-4 text-xs text-muted-foreground">
                        <Plus className="mr-1 h-3 w-3" /> Empty
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
