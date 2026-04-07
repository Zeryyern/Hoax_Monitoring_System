import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, Search, ChevronDown, ChevronUp, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { formatNewsPublishedAt } from '@/app/utils/newsDates';

interface NewsItem {
  id: number;
  title: string;
  source: string;
  source_url?: string;
  published_at_source?: string;
  category: string;
  date: string;
  prediction: 'Hoax' | 'Legitimate';
  confidence: number;
  created_at?: string;
  content?: string;
  summary?: string;
  article_content?: string;
  url?: string;
  link?: string;
}

const SOURCE_NAMES = [
  'TurnBackHoax',
  'Antara Anti-Hoax',
  'Kompas Cek Fakta',
  'Detik Hoax or Not',
  'Tempo Hoax',
];

const NEWS_PER_PAGE = 6;

function normalizeSourceName(source: string): string | null {
  const value = (source || '').toLowerCase();
  if (value.includes('turnback')) return 'TurnBackHoax';
  if (value.includes('antara')) return 'Antara Anti-Hoax';
  if (value.includes('kompas')) return 'Kompas Cek Fakta';
  if (value.includes('detik')) return 'Detik Hoax or Not';
  if (value.includes('tempo')) return 'Tempo Hoax';
  return null;
}

function formatPublishedAt(item: NewsItem): string {
  return formatNewsPublishedAt(item);
}

export function NewsPage() {
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'Hoax' | 'Legitimate'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedArticleId, setExpandedArticleId] = useState<number | null>(null);
  const [articleDetails, setArticleDetails] = useState<Record<number, NewsItem>>({});
  const [loadingDetailsId, setLoadingDetailsId] = useState<number | null>(null);
  const [serverPagination, setServerPagination] = useState({
    page: 1,
    limit: NEWS_PER_PAGE,
    total: 0,
    pages: 1,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    const loadNews = async () => {
      setLoading(true);
      setError(null);
      const sourceParam = sourceFilter === 'all' ? undefined : sourceFilter;
      const predictionParam = filter === 'all' ? undefined : filter;
      const result = await apiClient.getNews(
        currentPage,
        NEWS_PER_PAGE,
        undefined,
        predictionParam,
        sourceParam,
        debouncedQuery || undefined,
      );
      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to load news');
      }

      const payload = result.data as {
        items: NewsItem[];
        pagination?: { page: number; limit: number; total: number; pages: number };
      };

      if (!cancelled) {
        setNewsData(payload.items || []);
        setServerPagination({
          page: payload.pagination?.page || currentPage,
          limit: payload.pagination?.limit || NEWS_PER_PAGE,
          total: payload.pagination?.total || 0,
          pages: Math.max(1, payload.pagination?.pages || 1),
        });
      }
    };

    loadNews()
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Backend not reachable');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentPage, sourceFilter, filter, debouncedQuery]);

  const normalizedNews = useMemo(() => {
    return newsData
      .map((item) => {
        const normalizedSource = normalizeSourceName(item.source || '');
        if (!normalizedSource) return null;
        return { ...item, source: normalizedSource };
      })
      .filter((item): item is NewsItem => item !== null && SOURCE_NAMES.includes(item.source));
  }, [newsData]);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedArticleId(null);
  }, [debouncedQuery, filter, sourceFilter]);

  useEffect(() => {
    if (currentPage > serverPagination.pages) {
      setCurrentPage(serverPagination.pages);
    }
  }, [currentPage, serverPagination.pages]);

  const showingStart = serverPagination.total === 0 ? 0 : (serverPagination.page - 1) * serverPagination.limit + 1;
  const showingEnd = serverPagination.total === 0
    ? 0
    : Math.min(showingStart + normalizedNews.length - 1, serverPagination.total);

  const getDisplayContent = (item: NewsItem | undefined) =>
    item?.content || item?.article_content || item?.summary || '';

  const getDisplayLink = (item: NewsItem | undefined) => item?.source_url || item?.url || item?.link || '';

  const handleCardClick = async (item: NewsItem) => {
    if (expandedArticleId === item.id) {
      setExpandedArticleId(null);
      return;
    }

    setExpandedArticleId(item.id);

    if (articleDetails[item.id]) return;

    try {
      setLoadingDetailsId(item.id);
      const result = await apiClient.getNewsDetail(item.id);

      if (result.success && result.data) {
        const detailData = result.data as Record<string, any>;
        const article = (detailData.item || detailData.news || detailData) as NewsItem;
        setArticleDetails((prev) => ({ ...prev, [item.id]: { ...item, ...article } }));
      } else {
        setArticleDetails((prev) => ({ ...prev, [item.id]: item }));
      }
    } catch {
      setArticleDetails((prev) => ({ ...prev, [item.id]: item }));
    } finally {
      setLoadingDetailsId(null);
    }
  };

  if (loading && newsData.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Loading monitored news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text mb-2">
            News Monitoring
          </h1>
          <p className="text-slate-400 text-lg">Explore analyzed content and hoax detection signals</p>
        </div>

        {error && (
          <div className="mb-6 border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-4 md:p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, source, or category"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'Hoax' | 'Legitimate')}
              className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Predictions</option>
              <option value="Hoax">Hoax</option>
              <option value="Legitimate">Legitimate</option>
            </select>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
            >
              <option value="all">All Sources</option>
              {SOURCE_NAMES.map((source) => (
                <option key={source} value={source}>{source}</option>
              ))}
            </select>
          </div>
        </div>

        {normalizedNews.length === 0 ? (
          <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-12 text-center text-slate-400">
            <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-60" />
            No results found.
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {normalizedNews.map((item) => (
                <div key={item.id} className="group relative">
                  <div className={`absolute -inset-0.5 rounded-xl blur opacity-20 transition group-hover:opacity-35 ${
                    item.prediction === 'Hoax' ? 'bg-gradient-to-r from-red-600 to-orange-500' : 'bg-gradient-to-r from-green-600 to-emerald-500'
                  }`} />
                  <div className="relative bg-slate-900/80 border border-slate-700 rounded-xl p-5 min-h-[280px] hover:border-cyan-400/30 transition overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleCardClick(item)}
                      className={`w-full text-left transition-all duration-300 ${
                        expandedArticleId === item.id ? 'opacity-20 scale-[0.98]' : 'opacity-100 scale-100'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 mb-3">
                        <h2 className="text-lg font-semibold text-slate-100 leading-tight">{item.title}</h2>
                        <span className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap ${
                          item.prediction === 'Hoax' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {item.prediction}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs sm:text-sm text-slate-400 mb-3">
                        <span>Click to read full article</span>
                        {expandedArticleId === item.id ? (
                          <ChevronUp className="w-4 h-4 text-cyan-300" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-500" />
                        )}
                      </div>

                      <div className="text-sm text-slate-400 space-y-1">
                        <p><span className="text-slate-300">Source:</span> {item.source}</p>
                        <p><span className="text-slate-300">Published Date:</span> {formatPublishedAt(item)}</p>
                        <p><span className="text-slate-300">Category:</span> {item.category || 'General'}</p>
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-1 rounded-md border border-slate-600 bg-slate-800/60 text-slate-200">
                          Source verified
                        </span>
                        <span className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-900/40 text-slate-300">
                          Click for details
                        </span>
                      </div>
                    </button>

                    <div
                      className={`absolute inset-0 p-5 bg-slate-900/95 rounded-xl transition-all duration-300 ${
                        expandedArticleId === item.id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-slate-100 leading-tight">{item.title}</h3>
                        <button
                          type="button"
                          onClick={() => setExpandedArticleId(null)}
                          className="text-xs px-3 py-1 rounded-md border border-slate-600 text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300"
                        >
                          Close
                        </button>
                      </div>
                      {loadingDetailsId === item.id ? (
                        <div className="flex items-center gap-2 text-slate-300 text-sm mt-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading full article...
                        </div>
                      ) : (
                        <div className="h-full overflow-y-auto pr-1">
                          <p className="text-slate-200 leading-relaxed whitespace-pre-line text-sm">
                            {getDisplayContent(articleDetails[item.id] || item) || 'Full article content is not available for this record.'}
                          </p>
                          {getDisplayLink(articleDetails[item.id] || item) && (
                            <a
                              href={getDisplayLink(articleDetails[item.id] || item)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 text-sm mt-4"
                            >
                              Open original source
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-3 border border-slate-700 bg-slate-900/70 rounded-xl px-4 py-3">
              <p className="text-sm text-slate-400">
                Showing {showingStart}-{showingEnd} of {serverPagination.total} articles
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpandedArticleId(null);
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                  }}
                  disabled={currentPage === 1 || loading}
                  className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-cyan-500/50 flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-sm text-slate-300 px-2">
                  Page {serverPagination.page} / {serverPagination.pages}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setExpandedArticleId(null);
                    setCurrentPage((prev) => Math.min(serverPagination.pages, prev + 1));
                  }}
                  disabled={currentPage === serverPagination.pages || loading}
                  className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-cyan-500/50 flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



