type DateLikeRecord = {
  published_at_source?: string | null;
  date?: string | null;
  created_at?: string | null;
};

function normalizeDateInput(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  // Handle "YYYY-MM-DD HH:mm:ss" (SQLite) by converting to ISO-like so Date parses consistently.
  if (raw.length >= 19 && raw[10] === ' ' && !raw.includes('T')) {
    return `${raw.slice(0, 10)}T${raw.slice(11, 19)}`;
  }
  return raw;
}

export function getNewsEventTimestampSeconds(item: DateLikeRecord | null | undefined): number {
  if (!item) return 0;
  const raw = item.published_at_source || item.date || item.created_at || '';
  const normalized = normalizeDateInput(raw);
  if (!normalized) return 0;
  const ts = new Date(normalized).getTime();
  return Number.isNaN(ts) ? 0 : Math.floor(ts / 1000);
}

export function formatNewsPublishedAt(item: DateLikeRecord | null | undefined): string {
  if (!item) return 'Unknown';
  const preferred = item.published_at_source || item.date || item.created_at || '';
  const normalized = normalizeDateInput(preferred);
  if (!normalized) return 'Unknown';
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return String(item.date || item.created_at || 'Unknown') || 'Unknown';
  return parsed.toLocaleString();
}

