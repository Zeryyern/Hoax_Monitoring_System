export type DailyTrendLike = {
  date?: string | null;
  prediction?: string | null;
  count?: unknown;
};

export type TrendPoint = {
  date: string;
  hoax: number;
  legitimate: number;
};

export type SourceLike = {
  source?: string | null;
  total_count?: unknown;
  hoax_count?: unknown;
  legitimate_count?: unknown;
};

export type SourcePoint = {
  source: string;
  totalCount: number;
  hoaxCount: number;
  legitimateCount: number;
};

function toFiniteNumber(value: unknown, fallback = 0): number {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizePrediction(value: unknown): 'Hoax' | 'Legitimate' | null {
  const raw = String(value ?? '').trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'hoax') return 'Hoax';
  if (raw === 'legitimate') return 'Legitimate';
  return null;
}

function normalizeSourceLabel(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return 'Unknown Source';
  if (raw.toLowerCase() === 'none' || raw.toLowerCase() === 'null') return 'Unknown Source';
  return raw.replace(/\s+/g, ' ');
}

function sortDateAsc(a: string, b: string): number {
  const aTs = Date.parse(a);
  const bTs = Date.parse(b);
  if (!Number.isNaN(aTs) && !Number.isNaN(bTs)) return aTs - bTs;
  return a.localeCompare(b);
}

export function buildTrendData(items: DailyTrendLike[]): TrendPoint[] {
  const map = new Map<string, TrendPoint>();

  for (const item of items || []) {
    const date = String(item?.date ?? '').trim();
    if (!date) continue;
    const current = map.get(date) || { date, hoax: 0, legitimate: 0 };

    const pred = normalizePrediction(item?.prediction);
    const count = toFiniteNumber(item?.count, 0);

    if (pred === 'Hoax') current.hoax += count;
    if (pred === 'Legitimate') current.legitimate += count;

    map.set(date, current);
  }

  return Array.from(map.values()).sort((a, b) => sortDateAsc(a.date, b.date));
}

export function buildSourceData(
  items: SourceLike[],
  options?: { topN?: number; minTotal?: number }
): SourcePoint[] {
  const topN = options?.topN ?? 10;
  const minTotal = options?.minTotal ?? 1;
  const map = new Map<string, SourcePoint>();

  for (const item of items || []) {
    const source = normalizeSourceLabel(item?.source);
    const hoaxCount = toFiniteNumber(item?.hoax_count, 0);
    const legitimateCount = toFiniteNumber(item?.legitimate_count, 0);
    const totalCountRaw = toFiniteNumber(item?.total_count, hoaxCount + legitimateCount);
    const totalCount = totalCountRaw || hoaxCount + legitimateCount;

    const current = map.get(source) || { source, totalCount: 0, hoaxCount: 0, legitimateCount: 0 };
    current.hoaxCount += hoaxCount;
    current.legitimateCount += legitimateCount;
    current.totalCount += totalCount;
    map.set(source, current);
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      totalCount: Math.max(0, row.totalCount),
      hoaxCount: Math.max(0, row.hoaxCount),
      legitimateCount: Math.max(0, row.legitimateCount),
    }))
    .filter((row) => row.totalCount >= minTotal)
    .sort((a, b) => b.totalCount - a.totalCount || a.source.localeCompare(b.source))
    .slice(0, topN);
}

