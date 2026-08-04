/**
 * URL-safe slug from arbitrary text. Lowercase, ascii, dash-separated.
 * Falls back to a short suffix when input yields nothing usable.
 */
export function toSlug(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return base || 'item';
}
