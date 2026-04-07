import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  AlertTriangle,
  Calendar,
  Search,
  TrendingUp,
  CheckCircle,
  Zap,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { formatNewsPublishedAt, getNewsEventTimestampSeconds } from '@/app/utils/newsDates';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface HoaxArticle {
  id: number;
  title: string;
  source: string;
  source_url?: string;
  published_at_source?: string;
  url?: string;
  link?: string;
  date: string;
  confidence: number;
  prediction: 'Hoax' | 'Legitimate';
  category?: string;
  created_at?: string;
}

interface Statistics {
  total_articles?: number;
  hoax_count?: number;
  legitimate_count?: number;
  avg_confidence?: number;
}

interface SourceInsight {
  source: string;
  total: number;
  hoax: number;
  legitimate: number;
}

interface HoaxSearchGroup {
  claim_key: string;
  query: string;
  verdict: 'Hoax' | 'Fact' | 'Unknown';
  hoax_accuracy_percent: number;
  corroboration_percent?: number;
  sources: { hoax: string[]; fact: string[]; total_unique: number };
  latest?: HoaxArticle;
  articles: HoaxArticle[];
}

interface HomePageProps {
  onNavigate?: (page: string) => void;
}

const SOURCE_NAMES = [
  'TurnBackHoax',
  'Antara Anti-Hoax',
  'Kompas Cek Fakta',
  'Detik Hoax or Not',
  'Tempo Hoax',
];

const CHART_COLORS = ['#22d3ee', '#3b82f6', '#14b8a6', '#f97316', '#f43f5e'];
const ARTICLES_PER_PAGE = 10;
const CHART_AXIS_TICK = { fill: '#cbd5e1', fontSize: 11 };
const CHART_TOOLTIP_STYLE = {
  background: '#0b1220',
  border: '1px solid #334155',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(2, 6, 23, 0.5)',
};

function normalizeSourceName(source: string): string | null {
  const value = (source || '').toLowerCase();

  if (value.includes('turnback')) return 'TurnBackHoax';
  if (value.includes('antara')) return 'Antara Anti-Hoax';
  if (value.includes('kompas')) return 'Kompas Cek Fakta';
  if (value.includes('detik')) return 'Detik Hoax or Not';
  if (value.includes('tempo')) return 'Tempo Hoax';

  return null;
}

function getCreatedAtTimestamp(article: HoaxArticle): number {
  const tsSeconds = getNewsEventTimestampSeconds(article);
  return tsSeconds ? tsSeconds * 1000 : Number.NaN;
}

function isDisplayableTitle(title: string): boolean {
  const value = String(title || '').trim();
  if (!value) return false;
  const lowered = value.toLowerCase();
  if ([
    'login',
    'log in',
    'sign in',
    'signin',
    'home',
    'index',
    'beranda',
    'artikel headline',
    'topik pilihan',
    'artikel terpopuler',
    'parapuan',
    '403',
    '404',
    '500',
  ].includes(lowered)) return false;
  if (/^[\d\s\W_]+$/u.test(value)) return false;
  return true;
}

function getDisplayTitle(article: HoaxArticle): string {
  const raw = String(article.title || '').trim();
  if (!raw) return 'Untitled article';
  // Drop obvious tracking fragments accidentally captured in titles.
  if (raw.includes('utm_') && raw.includes('?')) {
    return raw.split('?', 1)[0].trim() || 'Untitled article';
  }
  return raw;
}

function isDisplayableArticle(article: HoaxArticle): boolean {
  const title = String(article.title || '').trim();
  if (!isDisplayableTitle(title)) return false;
  const source = String(article.source || '').toLowerCase();
  const url = String(article.source_url || article.url || article.link || '').toLowerCase();
  if (source.includes('kompas')) {
    if (!url) return false;
    if (url.startsWith('https://indeks.kompas.com/')) return false;
    if (url.startsWith('https://www.kompas.com/parapuan')) return false;
    if (url.startsWith('https://account.kompas.com/login')) return false;
    const ok =
      url.startsWith('https://www.kompas.com/tren/read/') ||
      url.startsWith('https://cekfakta.kompas.com/read/');
    if (!ok) return false;
  }
  return true;
}

function formatPrimaryDateLabel(article: HoaxArticle): { label: string; value: string } {
  const published = article.published_at_source || article.date;
  if (!published) return { label: 'Published Date', value: 'Unknown' };
  return { label: 'Published Date', value: formatNewsPublishedAt(article) };
}

export function HomePage({ onNavigate }: HomePageProps) {
  const [hoaxes, setHoaxes] = useState<HoaxArticle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<HoaxSearchGroup[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [stats, setStats] = useState<Statistics>({
    total_articles: 0,
    hoax_count: 0,
    legitimate_count: 0,
    avg_confidence: 0,
  });
  const [sourceInsights, setSourceInsights] = useState<SourceInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePageStart, setActivePageStart] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (hoaxes.length === 0) {
      setActivePageStart(0);
      return;
    }

    const maxStart = Math.floor((hoaxes.length - 1) / ARTICLES_PER_PAGE) * ARTICLES_PER_PAGE;
    if (activePageStart > maxStart) {
      setActivePageStart(maxStart);
    }
  }, [hoaxes, activePageStart]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [recentResult, statsResult] = await Promise.all([
        apiClient.getRecentNews(100),
        apiClient.getRecentStatistics(30),
      ]);

      if (recentResult.success && recentResult.data) {
        const latestItems = (recentResult.data as HoaxArticle[]) || [];
        const cleanedItems = latestItems
          .map((item) => ({ ...item, title: getDisplayTitle(item) }))
          .filter((item) => isDisplayableArticle(item));

        const sortedClean = [...cleanedItems]
          .filter((item) => !Number.isNaN(getCreatedAtTimestamp(item)))
          .sort((a, b) => getCreatedAtTimestamp(b) - getCreatedAtTimestamp(a));

        // Show a stable, pageable window of the newest items (avoid shrinking to 1-2
        // records when "latest day" only contains a couple of articles).
        setHoaxes(sortedClean.slice(0, 100));
      }

      if (statsResult.success && statsResult.data) {
        const data = statsResult.data as { totals?: Statistics };
        setStats(data.totals || {});
      }

      const baseMap = SOURCE_NAMES.reduce((acc, source) => {
        acc.set(source, { source, total: 0, hoax: 0, legitimate: 0 });
        return acc;
      }, new Map<string, SourceInsight>());
      const sourceRows =
        (statsResult.success && statsResult.data
          ? ((statsResult.data as { sources?: Array<{ source: string; total_count: number; hoax_count: number; legitimate_count: number }> }).sources || [])
          : []) || [];
      sourceRows.forEach((row) => {
        const sourceName = normalizeSourceName(row.source || '');
        if (!sourceName) return;
        const bucket = baseMap.get(sourceName);
        if (!bucket) return;
        bucket.total = row.total_count || 0;
        bucket.hoax = row.hoax_count || 0;
        bucket.legitimate = row.legitimate_count || 0;
      });

      setSourceInsights(Array.from(baseMap.values()));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runHoaxSearch = async (q: string) => {
    const trimmed = String(q || '').trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    try {
      setSearching(true);
      setSearchError(null);
      const resp = await apiClient.searchHoaxClaims(trimmed, 10, 5);
      if (!resp.success) {
        setSearchResults([]);
        setSearchError(resp.error || 'Search failed');
        return;
      }
      setSearchResults((resp.data as HoaxSearchGroup[]) || []);
    } finally {
      setSearching(false);
    }
  };

  const visibleArticles = hoaxes.slice(activePageStart, activePageStart + ARTICLES_PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(hoaxes.length / ARTICLES_PER_PAGE));
  const currentPage = Math.floor(activePageStart / ARTICLES_PER_PAGE) + 1;

  const sourceHoaxPie = useMemo(
    () => sourceInsights.map((item) => ({ name: item.source, value: item.hoax })).filter((item) => item.value > 0),
    [sourceInsights]
  );

	  const totalSourceRecords = sourceInsights.reduce((sum, item) => sum + item.total, 0);
	  const totalSourceHoaxes = sourceInsights.reduce((sum, item) => sum + item.hoax, 0);
	  const totalSourceLegitimate = sourceInsights.reduce((sum, item) => sum + item.legitimate, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading hoax detection data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <section className="px-4 sm:px-6 lg:px-8 py-16 md:py-20 border-b border-slate-700 bg-gradient-to-b from-slate-800 to-slate-900 overflow-hidden relative">
        <div className="absolute top-10 left-20 w-72 h-72 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-10 w-72 h-72 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }} />

        <div className="max-w-4xl mx-auto text-center animate-fade-in relative z-10">
          <div className="mb-6">
            <div className="inline-block mb-4 animate-slide-down">
              <span className="px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-semibold tracking-wide">
                Intelligent Detection
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 bg-clip-text text-transparent animate-slide-up">
              Hoax Monitoring System
            </h1>
          </div>
          <p className="text-slate-300 mb-8 max-w-2xl mx-auto text-base md:text-lg leading-relaxed animate-slide-up" style={{ animationDelay: '0.2s' }}>
            Advanced hoax monitoring system for detecting misinformation and tracking signals from 5 verified hoax-monitoring sources.
          </p>
          <button
            onClick={() => onNavigate?.('news')}
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 mx-auto shadow-lg hover:shadow-blue-500/50 animate-slide-up"
            style={{ animationDelay: '0.3s' }}
          >
            <span>Analyze an Article</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-slate-700 bg-slate-800/50">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group cursor-pointer animate-slide-up" style={{ animationDelay: '0.1s' }}>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text mb-2 group-hover:scale-110 transition-transform duration-300">
                {stats.total_articles || 0}
              </div>
              <p className="text-slate-400 font-medium">Articles Analyzed</p>
            </div>
            <div className="text-center group cursor-pointer animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text mb-2 group-hover:scale-110 transition-transform duration-300">
                {stats.hoax_count || 0}
              </div>
              <p className="text-slate-400 font-medium">Hoaxes Detected</p>
            </div>
            <div className="text-center group cursor-pointer animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text mb-2 group-hover:scale-110 transition-transform duration-300">
                {stats.legitimate_count || 0}
              </div>
              <p className="text-slate-400 font-medium">Verified Legitimate</p>
            </div>
          </div>
        </div>
      </section>

	      <section className="px-4 sm:px-6 lg:px-8 py-12 md:py-16 border-b border-slate-700">
	        <div className="max-w-6xl mx-auto">
	          <div className="flex items-center justify-between mb-8 flex-col md:flex-row gap-4">
	            <div>
	              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-transparent bg-gradient-to-r from-white to-slate-300 bg-clip-text">
	                Latest Detected Articles
	              </h2>
	              <p className="text-slate-400">Compact navigator view to keep homepage clean</p>
	            </div>
	            <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
	              <AlertTriangle className="w-5 h-5 text-red-400" />
	              <span className="font-semibold text-red-400">
                  Showing {hoaxes.length ? activePageStart + 1 : 0}-{Math.min(activePageStart + ARTICLES_PER_PAGE, hoaxes.length)} of {hoaxes.length}
                </span>
	            </div>
	          </div>

          <div className="mb-8 border border-slate-700 rounded-xl bg-slate-900/35 p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-white">Hoax Search</h3>
                <p className="text-sm text-slate-400">
                  Search a claim and see consensus across sources (HOAX becomes FACT if any source verifies it as not hoax).
                </p>
              </div>
              <form
                className="w-full md:w-[520px]"
                onSubmit={(e) => {
                  e.preventDefault();
                  runHoaxSearch(searchQuery);
                }}
              >
                <div className="flex items-stretch gap-2">
                  <div className="flex items-center gap-2 flex-1 px-3 rounded-lg border border-slate-700 bg-slate-950/40 focus-within:border-cyan-500/50">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type a hoax claim, name, or topic..."
                      className="w-full bg-transparent py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 rounded-lg border border-cyan-500/40 bg-cyan-500/10 text-cyan-200 text-sm font-semibold hover:bg-cyan-500/15"
                    disabled={searching}
                  >
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                  <button
                    type="button"
                    className="px-3 rounded-lg border border-slate-700 bg-slate-950/30 text-slate-300 text-sm font-semibold hover:border-slate-500"
                    onClick={() => {
                      setSearchQuery('');
                      setSearchResults([]);
                      setSearchError(null);
                    }}
                    disabled={searching}
                  >
                    Clear
                  </button>
                </div>
              </form>
            </div>

            {searchError && (() => {
              const raw = String(searchError || '').trim();
              const [summaryPart, attemptsPart] = raw.split('Attempts:');
              const summary = summaryPart.replace(/\s+/g, ' ').trim();
              const attempts = (attemptsPart || '').trim();
              const showDetails = attempts.length > 0 || raw.length > 220;
              const detailText = attempts ? `Attempts: ${attempts}` : raw;

              return (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm font-semibold text-red-200">Hoax search is temporarily unavailable.</p>
                  <p className="mt-1 text-sm text-red-200/80">{summary || 'Backend error. Please try again.'}</p>
                  {showDetails && (
                    <details className="mt-2">
                      <summary className="cursor-pointer select-none text-xs font-semibold text-red-200/90">
                        Technical details
                      </summary>
                      <pre className="mt-2 whitespace-pre-wrap text-xs text-red-200/75">{detailText}</pre>
                    </details>
                  )}
                </div>
              );
            })()}

            {!searching && !searchError && searchQuery.trim() && searchResults.length === 0 && (
              <p className="mt-3 text-sm text-slate-400">
                No matches found. Try a shorter keyword or paste the article headline.
              </p>
            )}

            {searchResults.length > 0 && (
              <div className="mt-5 space-y-3">
                {searchResults.map((group) => {
                  const latest = group.latest || (group.articles && group.articles[0]);
                  const url = (latest as any)?.source_url || (latest as any)?.url || (latest as any)?.link || '';
                  const isFact = group.verdict === 'Fact';
                  const publishedLabel = latest ? formatPrimaryDateLabel(latest as any) : null;
                  return (
                    <div key={group.claim_key} className="rounded-lg border border-slate-700 bg-slate-950/35 px-4 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                                isFact
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                  : 'border-red-500/40 bg-red-500/15 text-red-300'
                              }`}
                            >
                              {isFact ? 'FACT' : group.verdict.toUpperCase()}
                            </span>
                            {group.verdict === 'Hoax' && (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-600 bg-slate-900 text-slate-200">
                                Hoax: {group.hoax_accuracy_percent}%
                              </span>
                            )}
                            {group.verdict === 'Hoax' && (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-md border border-slate-600 bg-slate-900 text-slate-200">
                                Corroboration: {group.corroboration_percent ?? 0}%
                              </span>
                            )}
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                              {group.sources?.total_unique || 0} sources
                            </span>
                          </div>
                          <p className="text-sm text-white font-semibold leading-snug break-words">
                            {(latest as any)?.title || group.claim_key}
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Hoax sources: {(group.sources?.hoax || []).join(', ') || 'None'} | Fact sources:{' '}
                            {(group.sources?.fact || []).join(', ') || 'None'}
                          </p>
                          {publishedLabel && (
                            <p className="text-xs text-slate-500 mt-1">
                              {publishedLabel.label}: {publishedLabel.value}
                            </p>
                          )}
                        </div>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200 shrink-0"
                          >
                            View Latest Source
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

	          {visibleArticles.length > 0 ? (
	            <div className="border border-slate-700 bg-gradient-to-r from-slate-800/70 to-slate-800/40 p-6 rounded-xl">
	              <div className="space-y-3">
	                {visibleArticles.map((article, idx) => {
	                  const primaryDate = formatPrimaryDateLabel(article);
	                  return (
	                  <div key={article.id} className="rounded-lg border border-slate-700 bg-slate-900/45 px-4 py-3 hover:border-cyan-500/40 transition-colors">
	                    <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
	                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-md border ${
                          article.prediction === 'Hoax'
                            ? 'border-red-500/40 bg-red-500/15 text-red-300'
                            : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                        }`}>
                          {article.prediction}
                        </span>
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-300">
                          {normalizeSourceName(article.source || '') || article.source || 'Unknown Source'}
                        </span>
                          <span className="px-2 py-1 text-xs font-semibold rounded-md border border-slate-600 bg-slate-800 text-slate-300">
                          #{activePageStart + idx + 1}
                        </span>
                        </div>
	                        <h3 className="text-sm md:text-base text-white font-semibold leading-snug truncate">
	                          {getDisplayTitle(article)}
	                        </h3>
	                      </div>

		                      <div className="text-left sm:text-right shrink-0 w-full sm:w-auto">
		                        <div className="flex items-center sm:justify-end gap-2 text-xs text-slate-400 mb-2">
		                          <Calendar className="w-3.5 h-3.5" />
		                          {primaryDate.label}: {primaryDate.value}
		                        </div>
		                        <p className="text-xs text-slate-500 mt-1">{article.category || 'General'}</p>
		                        {(article.source_url || article.url || article.link) && (
		                          <a
		                            href={article.source_url || article.url || article.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                          >
                            View Source
                            <ArrowRight className="w-3.5 h-3.5" />
                          </a>
                        )}
	                      </div>
	                    </div>
	                  </div>
	                  );
	                })}
	              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <button
                  onClick={() =>
                    setActivePageStart((prev) => {
                      if (hoaxes.length === 0) return 0;
                      const maxStart = Math.floor((hoaxes.length - 1) / ARTICLES_PER_PAGE) * ARTICLES_PER_PAGE;
                      return prev === 0 ? maxStart : Math.max(0, prev - ARTICLES_PER_PAGE);
                    })
                  }
                  className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 hover:border-cyan-500/50 flex items-center justify-center gap-2"
                >
	                  <ChevronLeft className="w-4 h-4" />
	                  Previous 10
	                </button>

                <div className="text-sm text-slate-300 font-medium">
                  Page {currentPage} / {totalPages}
                </div>

	                <button
	                  onClick={() =>
	                    setActivePageStart((prev) => {
	                      if (hoaxes.length === 0) return 0;
	                      const maxStart = Math.floor((hoaxes.length - 1) / ARTICLES_PER_PAGE) * ARTICLES_PER_PAGE;
	                      return prev >= maxStart ? 0 : prev + ARTICLES_PER_PAGE;
	                    })
	                  }
	                  className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 hover:border-cyan-500/50 flex items-center justify-center gap-2"
	                >
	                  Next 10
	                  <ChevronRight className="w-4 h-4" />
	                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 border border-slate-700 rounded-xl">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No articles available yet</p>
            </div>
          )}
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-14 md:py-20 border-b border-slate-700">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-12 text-center text-transparent bg-gradient-to-r from-white to-slate-300 bg-clip-text">
            Why Choose Our System?
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: 'Automated Detection',
                description: 'Robust classification rules detect hoaxes with high confidence in real-time.',
                color: 'from-blue-600 to-cyan-600',
              },
              {
                icon: TrendingUp,
                title: 'Comprehensive Analytics',
                description: 'Track source-level trends and misinformation patterns with visual summaries.',
                color: 'from-green-600 to-emerald-600',
              },
              {
                icon: CheckCircle,
                title: 'Trusted Source Tracking',
                description: 'Monitors 5 known anti-hoax source feeds with source-specific visibility.',
                color: 'from-indigo-600 to-blue-600',
              },
            ].map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="p-8 bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-lg hover:border-slate-600 transition-all duration-300 animate-slide-up group cursor-pointer hover:scale-105 hover:shadow-xl hover:shadow-slate-900"
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                  <p className="text-slate-400 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8 py-14 md:py-20 bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border-t border-slate-700">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">
            <div className="xl:col-span-2 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
              <h2 className="text-3xl font-bold text-white mb-3">Start Your Free Trial</h2>
              <p className="text-slate-300 mb-6">Live snapshot of scraped hoax signals from your 5 configured sources.</p>
              <button
                onClick={() => onNavigate?.('signup')}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all duration-300"
              >
                Start Your Free Trial
              </button>

              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <p className="text-slate-400">Tracked Sources</p>
                  <p className="text-white font-bold">5</p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <p className="text-slate-400">Source Records</p>
                  <p className="text-white font-bold">{totalSourceRecords}</p>
                </div>
	                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
	                  <p className="text-slate-400">Hoax from Sources</p>
	                  <p className="text-red-300 font-bold">{totalSourceHoaxes}</p>
	                </div>
	                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
	                  <p className="text-slate-400">Legitimate from Sources</p>
	                  <p className="text-emerald-300 font-bold">{totalSourceLegitimate}</p>
	                </div>
	              </div>
	            </div>

            <div className="xl:col-span-3 rounded-xl border border-slate-700 bg-slate-900/70 p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                <div>
                  <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" />
                    Hoax Count by Source
	                  </h3>
	                  <div className="h-64">
	                    {totalSourceHoaxes > 0 ? (
	                      <ResponsiveContainer width="100%" height="100%">
	                        <BarChart data={sourceInsights}>
	                          <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
	                          <XAxis
	                            dataKey="source"
	                            tick={CHART_AXIS_TICK}
	                            interval={0}
	                            angle={-16}
	                            textAnchor="end"
	                            height={58}
	                            axisLine={{ stroke: '#334155' }}
	                            tickLine={{ stroke: '#334155' }}
	                          />
	                          <YAxis tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
	                          <Tooltip
	                            contentStyle={CHART_TOOLTIP_STYLE}
	                            labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
	                            itemStyle={{ color: '#e2e8f0', fontWeight: 600 }}
	                          />
	                          <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
	                          <Bar dataKey="hoax" name="Hoax Articles" fill="#f43f5e" radius={[8, 8, 0, 0]} barSize={32} />
	                        </BarChart>
	                      </ResponsiveContainer>
	                    ) : (
	                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
	                        No hoax articles found for the selected period.
	                      </div>
	                    )}
	                  </div>
	                </div>

                <div>
	                  <h3 className="text-white font-semibold mb-4">Hoax Share by Source</h3>
	                  <div className="h-64">
	                    {sourceHoaxPie.length > 0 ? (
	                      <ResponsiveContainer width="100%" height="100%">
	                        <PieChart>
	                          <Pie data={sourceHoaxPie} dataKey="value" nameKey="name" outerRadius={92} innerRadius={46} paddingAngle={2}>
	                            {sourceHoaxPie.map((entry, index) => (
	                              <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
	                            ))}
	                          </Pie>
	                          <Tooltip
	                            contentStyle={CHART_TOOLTIP_STYLE}
	                            labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
	                            itemStyle={{ color: '#e2e8f0', fontWeight: 600 }}
	                          />
	                          <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
	                        </PieChart>
	                      </ResponsiveContainer>
	                    ) : (
	                      <div className="h-full flex items-center justify-center text-slate-400 text-sm">
	                        No hoax source distribution available yet.
	                      </div>
	                    )}
	                  </div>
	                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-down {
          animation: slide-down 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}


