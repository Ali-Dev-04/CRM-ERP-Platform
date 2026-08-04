'use client';

import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { wsPath } from '@/lib/urls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/data';

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
      <h1 className="text-2xl font-bold">Knowledge base</h1>
      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {data && data.length === 0 && <p className="text-sm text-muted-foreground">No articles yet.</p>}
          {data?.map((a) => (
            <div key={a.id} className="flex items-center justify-between border-b pb-2">
              <div>
                <p className="font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.category ?? 'Uncategorized'}</p>
              </div>
              <Badge>{a.published ? 'Published' : 'Draft'}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
