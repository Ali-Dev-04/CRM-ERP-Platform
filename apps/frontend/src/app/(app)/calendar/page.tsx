'use client';

import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CalendarAgg {
  range: { from: string; to: string };
  meetings: { id: string; title: string; scheduledAt: string }[];
  tasks: { id: string; title: string; dueDate: string | null; project?: { name: string } }[];
}

export default function CalendarPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const path = wsPath(activeOrgId, activeWorkspaceId, '/calendar');
  const { data, loading } = useApi<CalendarAgg>(path);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>
      <p className="text-sm text-muted-foreground">
        {data ? `${formatDate(data.range.from)} → ${formatDate(data.range.to)}` : 'Upcoming 30 days'}
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Meetings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading && <p className="text-muted-foreground">Loading…</p>}
            {data && data.meetings.length === 0 && <p className="text-sm text-muted-foreground">No meetings scheduled.</p>}
            {data?.meetings.map((m) => (
              <div key={m.id} className="flex justify-between border-b pb-1">
                <span>{m.title}</span>
                <span className="text-xs text-muted-foreground">{formatDate(m.scheduledAt)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tasks due</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data && data.tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks due.</p>}
            {data?.tasks.map((t) => (
              <div key={t.id} className="flex justify-between border-b pb-1">
                <span>{t.title} {t.project ? <span className="text-xs text-muted-foreground">· {t.project.name}</span> : null}</span>
                <span className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
