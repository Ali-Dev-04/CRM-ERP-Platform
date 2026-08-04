'use client';

import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Notification {
  id: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const { data, loading } = useApi<Notification[]>('/notifications');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Notifications</h1>
      <Card>
        <CardHeader>
          <CardTitle>Inbox</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && <p className="text-muted-foreground">Loading…</p>}
          {data && data.length === 0 && <p className="text-sm text-muted-foreground">No notifications.</p>}
          {data?.map((n) => (
            <div key={n.id} className={`rounded-md border p-3 ${n.readAt ? 'opacity-60' : 'bg-muted/30'}`}>
              <div className="flex items-center justify-between">
                <p className="font-medium">{n.title}</p>
                <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
              </div>
              <p className="text-sm text-muted-foreground">{n.message}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
