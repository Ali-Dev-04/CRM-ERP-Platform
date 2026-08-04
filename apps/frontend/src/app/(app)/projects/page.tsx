'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, Td, Th } from '@/components/ui/data';
import type { Paginated, Project, Task } from '@/lib/types';

const COLUMNS: { key: Task['status']; label: string }[] = [
  { key: 'TODO', label: 'To do' },
  { key: 'IN_PROGRESS', label: 'In progress' },
  { key: 'IN_REVIEW', label: 'In review' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'DONE', label: 'Done' },
];

const PRIORITY_TONE: Record<string, string> = {
  LOW: 'text-muted-foreground',
  MEDIUM: 'text-blue-600',
  HIGH: 'text-amber-600',
  URGENT: 'text-red-600',
};

export default function ProjectsPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const projectsPath = wsPath(activeOrgId, activeWorkspaceId, '/projects?size=50');
  const { data: projectsData } = useApi<Paginated<Project>>(projectsPath);
  const projects = useMemo(() => projectsData?.items ?? [], [projectsData]);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (!selected && projects.length > 0) setSelected(projects[0]!.id);
  }, [projects, selected]);

  const tasksPath = selected ? wsPath(activeOrgId, activeWorkspaceId, `/projects/${selected}/tasks`) : null;
  const { data: tasks, loading } = useApi<Task[]>(tasksPath);

  const byColumn = useMemo(() => {
    const map: Record<string, Task[]> = {};
    for (const col of COLUMNS) map[col.key] = [];
    for (const t of tasks ?? []) (map[t.status] ??= []).push(t);
    return map;
  }, [tasks]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Projects</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Select project</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No projects yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <Th>Name</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr
                      key={p.id}
                      className={cn('cursor-pointer border-t', selected === p.id && 'bg-muted')}
                      onClick={() => setSelected(p.id)}
                    >
                      <Td className="font-medium">{p.name}</Td>
                      <Td><Badge>{p.status.replace(/_/g, ' ').toLowerCase()}</Badge></Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected && (
        <div>
          <h2 className="mb-3 text-lg font-semibold">Board</h2>
          {loading && <p className="text-muted-foreground">Loading tasks…</p>}
          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
            {COLUMNS.map((col) => (
              <div key={col.key} className="rounded-lg border bg-muted/20">
                <div className="border-b px-3 py-2 text-sm font-medium">
                  {col.label} <span className="text-muted-foreground">({byColumn[col.key]?.length ?? 0})</span>
                </div>
                <div className="space-y-2 p-2">
                  {(byColumn[col.key] ?? []).map((t) => (
                    <div key={t.id} className="rounded-md border bg-card p-2 text-sm shadow-sm">
                      <p className="font-medium">{t.title}</p>
                      <p className={cn('text-xs', PRIORITY_TONE[t.priority])}>{t.priority.toLowerCase()}</p>
                    </div>
                  ))}
                  {(byColumn[col.key]?.length ?? 0) === 0 && (
                    <p className="px-1 py-2 text-xs text-muted-foreground">Empty</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
