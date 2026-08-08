'use client';

import { Bell, Check } from 'lucide-react';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';

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
      <PageHeader title="Notifications" subtitle="Your recent activity and alerts." />

      <Card className="card-elevated">
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : data && data.length > 0 ? (
            <ul className="divide-y divide-border">
              {data.map((n) => (
                <li key={n.id} className={`flex items-start gap-3 p-4 ${n.readAt ? 'opacity-60' : ''}`}>
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.readAt ? 'bg-muted text-muted-foreground' : 'brand-gradient text-white'}`}>
                    {n.readAt ? <Check className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{n.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Bell className="h-5 w-5" />} title="You're all caught up" hint="New notifications will show here." />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
