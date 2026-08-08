'use client';

import { BookOpen, FileText } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';

interface Article {
  id: string;
  title: string;
  category: string | null;
  published: boolean;
  updatedAt: string;
}

export default function KnowledgePage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const path = wsPath(activeOrgId, activeWorkspaceId, '/knowledge');
  const { data, loading } = useApi<Article[]>(path);

  return (
    <div className="space-y-6">
      <PageHeader title="Knowledge base" subtitle="Guides, policies, and internal docs." />

      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : data && data.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted/40">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">{a.category ?? 'Uncategorized'} · updated {formatDate(a.updatedAt)}</p>
                    </div>
                  </div>
                  <StatusPill status={a.published ? 'PUBLISHED' : 'DRAFT'} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<BookOpen className="h-5 w-5" />} title="No articles yet" hint="Published guides will appear here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
