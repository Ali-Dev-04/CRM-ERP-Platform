'use client';

import { useRef, useState } from 'react';
import { Paperclip, Upload, Download, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { apiFetch } from '@/lib/api';
import { wsPath } from '@/lib/urls';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton, EmptyState } from '@/components/ui/skeleton';
import type { ApiError, DocFile, Paginated } from '@/lib/types';

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FilesPage() {
  const { activeOrgId, activeWorkspaceId } = useAuth();
  const base = wsPath(activeOrgId, activeWorkspaceId, '');
  const { data, loading, reload } = useApi<Paginated<DocFile>>(base ? `${base}/documents?size=100` : null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !base) return;
    setBusy(true); setErrMsg(null); setHint(null);
    try {
      const presigned = await apiFetch<{ document: DocFile; uploadUrl: string }>(`${base}/files/presign-upload`, {
        method: 'POST',
        body: JSON.stringify({ fileName: file.name, contentType: file.type || 'application/octet-stream', sizeBytes: file.size }),
      });
      // Upload bytes directly to object storage.
      const putRes = await fetch(presigned.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type || 'application/octet-stream' } });
      if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);
      setHint(`${file.name} uploaded.`);
      reload();
    } catch (err) {
      setErrMsg((err as ApiError).message || (err as Error).message);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function download(d: DocFile) {
    if (!base) return;
    try {
      const { downloadUrl } = await apiFetch<{ downloadUrl: string }>(`${base}/files/${d.id}/download-url`);
      window.open(downloadUrl, '_blank');
    } catch (err) { setErrMsg((err as ApiError).message); }
  }
  async function remove(d: DocFile) {
    if (!base) return;
    try { await apiFetch(`${base}/documents/${d.id}`, { method: 'DELETE' }); reload(); }
    catch (err) { setErrMsg((err as ApiError).message); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Files" subtitle="Upload and share documents (stored in S3)." actions={
        <>
          <input ref={inputRef} type="file" className="hidden" onChange={onFile} />
          <Button onClick={() => inputRef.current?.click()} disabled={busy} className="gap-2"><Upload className="h-4 w-4" /> {busy ? 'Uploading…' : 'Upload file'}</Button>
        </>
      } />

      <Card className="card-elevated"><CardContent className="p-0">
        {loading ? <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        : data && data.items.length > 0 ? (
          <ul className="divide-y divide-border">
            {data.items.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary"><Paperclip className="h-4 w-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{fmtSize(Number(d.sizeBytes))} · {formatDate(d.createdAt)}</p>
                </div>
                <button onClick={() => download(d)} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Download"><Download className="h-4 w-4" /></button>
                <button onClick={() => remove(d)} className="rounded-md p-1.5 text-muted-foreground hover:bg-danger-soft hover:text-danger" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
          </ul>
        ) : <EmptyState icon={<Paperclip className="h-5 w-5" />} title="No files yet" hint="Upload a file using the button above (requires S3/MinIO configured)." />}
      </CardContent></Card>
      {hint && <p className="text-sm text-success">{hint}</p>}
      {errMsg && <p className="text-sm text-danger">{errMsg}</p>}
    </div>
  );
}
