'use client';

import { useMemo, useState } from 'react';
import { Sparkles, Loader2, CornerDownLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { AiResult, ApiError, Client, Meeting, Paginated, Project } from '@/lib/types';

type Need = 'project' | 'client' | 'meeting' | 'text';
interface ToolDef {
  id: string;
  label: string;
  hint: string;
  needs: Need[];
  textLabel?: string;
  method: 'POST' | 'GET';
  path: (p: { project?: string; client?: string; meeting?: string; text?: string }) => string;
}

const TOOLS: ToolDef[] = [
  { id: 'pm', label: 'Project Manager', hint: 'Health, risks, next actions for a project.', needs: ['project'], method: 'POST', path: (p) => `/ai/project-manager/${p.project}` },
  { id: 'tasks', label: 'Task Generator', hint: 'Suggest tasks from a goal.', needs: ['project', 'text'], textLabel: 'Goal', method: 'POST', path: (p) => `/ai/task-generator/${p.project}` },
  { id: 'meeting', label: 'Meeting Summary', hint: 'Decisions and action items.', needs: ['meeting'], method: 'POST', path: (p) => `/ai/meeting-summary/${p.meeting}` },
  { id: 'email', label: 'Client Email', hint: 'Draft a ready-to-send email.', needs: ['client', 'text'], textLabel: 'Intent', method: 'POST', path: (p) => `/ai/client-email/${p.client}` },
  { id: 'proposal', label: 'Proposal', hint: 'Draft a proposal from scope.', needs: ['client', 'text'], textLabel: 'Scope of work', method: 'POST', path: (p) => `/ai/proposal/${p.client}` },
  { id: 'weekly', label: 'Weekly Report', hint: 'Executive weekly summary.', needs: [], method: 'POST', path: () => `/ai/weekly-report` },
  { id: 'finance', label: 'Financial Summary', hint: 'Receivables health + recommendations.', needs: [], method: 'POST', path: () => `/ai/financial-summary` },
  { id: 'search', label: 'Search Assistant', hint: 'Ask about your workspace data.', needs: ['text'], textLabel: 'Question', method: 'POST', path: () => `/ai/search` },
  { id: 'ask', label: 'Ask the Dashboard', hint: 'Natural-language KPI question.', needs: ['text'], textLabel: 'Question', method: 'GET', path: (p) => `/ai/ask?query=${encodeURIComponent(p.text ?? '')}` },
];

export default function AssistantPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const projectsApi = useApi<Paginated<Project>>(base ? `${base}/projects?size=50` : null);
  const clientsApi = useApi<Paginated<Client>>(base ? `${base}/clients?size=100` : null);
  const meetingsApi = useApi<Paginated<Meeting>>(base ? `${base}/meetings?size=50` : null);

  const projects = projectsApi.data?.items ?? [];
  const clients = clientsApi.data?.items ?? [];
  const meetings = meetingsApi.data?.items ?? [];

  const [toolId, setToolId] = useState(TOOLS[0]!.id);
  const [project, setProject] = useState('');
  const [clientV, setClientV] = useState('');
  const [meeting, setMeeting] = useState('');
  const [text, setText] = useState('');
  const [result, setResult] = useState<AiResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const tool = useMemo(() => TOOLS.find((t) => t.id === toolId)!, [toolId]);
  const needs = (n: Need) => tool.needs.includes(n);

  async function run() {
    if (!base) return;
    if (needs('project') && !project) { setErrMsg('Pick a project.'); return; }
    if (needs('client') && !clientV) { setErrMsg('Pick a client.'); return; }
    if (needs('meeting') && !meeting) { setErrMsg('Pick a meeting.'); return; }
    if (needs('text') && !text.trim()) { setErrMsg('Provide some input.'); return; }
    setBusy(true); setErrMsg(null); setResult(null);
    try {
      const path = tool.path({ project, client: clientV, meeting, text });
      const body = tool.method === 'POST' && needs('text') ? JSON.stringify({ goal: text, intent: text, scope: text, query: text }) : undefined;
      const res = await apiFetch<AiResult>(`${base}${path}`, { method: tool.method, body });
      setResult(res);
    } catch (err) {
      setErrMsg((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="AI Assistant" subtitle="Nine AI tools grounded in your workspace data." />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <div className="space-y-1">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setToolId(t.id); setResult(null); setErrMsg(null); }}
              className={cn('flex w-full flex-col rounded-lg border p-3 text-left transition-all', t.id === toolId ? 'border-primary bg-primary-soft' : 'border-border bg-card hover:border-primary/40')}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className={cn('h-3.5 w-3.5', t.id === toolId ? 'text-primary' : 'text-muted-foreground')} />{t.label}
              </span>
              <span className="mt-0.5 text-xs text-muted-foreground">{t.hint}</span>
            </button>
          ))}
        </div>

        <Card className="card-elevated">
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="text-base font-semibold">{tool.label}</h2>
              <p className="text-sm text-muted-foreground">{tool.hint}</p>
            </div>

            {projectsApi.loading || clientsApi.loading || meetingsApi.loading ? (
              <Skeleton className="h-10" />
            ) : (
              <div className="space-y-3">
                {needs('project') && (
                  <div className="space-y-1.5">
                    <Label>Project</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={project} onChange={(e) => setProject(e.target.value)}>
                      <option value="">Select…</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                {needs('client') && (
                  <div className="space-y-1.5">
                    <Label>Client</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={clientV} onChange={(e) => setClientV(e.target.value)}>
                      <option value="">Select…</option>
                      {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                )}
                {needs('meeting') && (
                  <div className="space-y-1.5">
                    <Label>Meeting</Label>
                    <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={meeting} onChange={(e) => setMeeting(e.target.value)}>
                      <option value="">Select…</option>
                      {meetings.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                  </div>
                )}
                {needs('text') && (
                  <div className="space-y-1.5">
                    <Label htmlFor="aitext">{tool.textLabel ?? 'Input'}</Label>
                    <Input id="aitext" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type here…" />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button onClick={run} disabled={busy} className="gap-2">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CornerDownLeft className="h-4 w-4" />} Run
              </Button>
              {result?.mocked ? (
                <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">Mock mode — set AI_API_KEY for real output</span>
              ) : null}
            </div>

            {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
            {result && (
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed">{result.content}</pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
