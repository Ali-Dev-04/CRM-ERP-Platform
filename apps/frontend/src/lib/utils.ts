import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format integer cents as a currency string. */
export function formatCurrency(cents: number | string, currency = 'USD'): string {
  const value = typeof cents === 'string' ? Number(cents) : cents;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value / 100);
}

/** Short date formatting. */
export function formatDate(input: string | Date | null | undefined): string {
  if (!input) return '—';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(input));
}
