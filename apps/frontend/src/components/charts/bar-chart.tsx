'use client';

import { formatCurrency } from '@/lib/utils';

export interface BarDatum {
  label: string;
  /** numeric value used for bar scaling */
  value: number;
  /** optional display string (e.g. formatted money); defaults to value */
  display?: string;
}

/**
 * Dependency-free SVG bar chart. Pure presentational; bars scale to the max.
 */
export function BarChart({ data, height = 180 }: { data: BarDatum[]; height?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  const barW = 100 / Math.max(data.length, 1);
  const gap = barW * 0.32;
  const innerH = height - 28;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-[180px] w-full overflow-visible">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.55)" />
          </linearGradient>
        </defs>
        {data.map((d, i) => {
          const h = (d.value / max) * innerH;
          const x = i * barW + gap / 2;
          const w = barW - gap;
          const y = innerH - h + 6;
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={w} height={Math.max(h, 0.8)} rx={1.2} fill="url(#barGrad)" />
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex">
        {data.map((d) => (
          <div key={d.label} className="flex-1 text-center text-[11px] text-muted-foreground">
            {d.label}
          </div>
        ))}
      </div>
      <div className="sr-only">
        {data.map((d) => `${d.label}: ${d.display ?? d.value}`).join('; ')}
      </div>
    </div>
  );
}

/** Convenience wrapper that formats cents into money display strings. */
export function MoneyBarChart({ data, height }: { data: { label: string; cents: number | string }[]; height?: number }) {
  return (
    <BarChart
      height={height}
      data={data.map((d) => ({
        label: d.label,
        value: typeof d.cents === 'string' ? Number(d.cents) : d.cents,
        display: formatCurrency(d.cents),
      }))}
    />
  );
}
