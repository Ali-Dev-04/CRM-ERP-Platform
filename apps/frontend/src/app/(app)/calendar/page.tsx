'use client';

import { CalendarDays, ListTodo } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';

interface CalendarAgg {
  range: { from: string; to: string };
  meetings: { id: string; title: string; scheduledAt: string }[];
  tasks: { id: string; title: string; dueDate: string | null; project?: { name: string } }[];
}

function Section({
  icon: Icon,
  title,
  children,
  empty,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  empty: string;
}) {
  return (
    <Card className="card-elevated">
      <CardHeader className="flex-row items-center gap-2 space-y-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children ?? <EmptyState title={empty} />}
      </CardContent>
    </Card>
  );
}

export default function CalendarPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const path = wsPath(activeOrgId, activeWorkspaceId, '/calendar');
  const { data, loading } = useApi<CalendarAgg>(path);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        subtitle={data ? `${formatDate(data.range.from)} → ${formatDate(data.range.to)}` : 'Upcoming meetings and tasks due.'}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
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
                    <span className="text-sm font-medium">
                      {t.title}
                      {t.project ? <span className="ml-1 text-xs text-muted-foreground">· {t.project.name}</span> : null}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(t.dueDate)}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Section>
        </div>
      )}
    </div>
  );
}
