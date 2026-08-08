import { cn } from '@/lib/utils';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'primary';

const TONES: Record<Tone, string> = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  primary: 'bg-primary-soft text-primary',
  muted: 'bg-muted text-muted-foreground',
};

/** Maps common business statuses to a coloured tone. Falls back to muted. */
export function statusTone(status: string): Tone {
  const s = status.toUpperCase();
  if (['PAID', 'ACTIVE', 'COMPLETED', 'DONE', 'APPROVED', 'AVAILABLE', 'COMPLETED'].includes(s)) return 'success';
  if (['SENT', 'PARTIALLY_PAID', 'IN_PROGRESS', 'IN_REVIEW', 'PENDING', 'ASSIGNED', 'PLANNING'].includes(s))
    return 'info';
  if (['OVERDUE', 'REJECTED', 'CANCELLED', 'BLACKLISTED', 'TERMINATED', 'BLOCKED', 'FAILED'].includes(s))
    return 'danger';
  if (['DRAFT', 'ON_HOLD', 'IN_REPAIR'].includes(s)) return 'warning';
  if (['URGENT'].includes(s)) return 'warning';
  if (['HIGH'].includes(s)) return 'info';
  if (['CONVERTED'].includes(s)) return 'primary';
  return 'muted';
}

/** Coloured pill for a status string, with friendly humanised label. */
export function StatusPill({ status, className }: { status: string; className?: string }) {
  const tone = statusTone(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize',
        TONES[tone],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', `bg-current opacity-70`)} />
      {status.replace(/_/g, ' ').toLowerCase()}
    </span>
  );
}
