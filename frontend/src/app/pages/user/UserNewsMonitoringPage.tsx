import { Search, Calendar, Filter, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { apiClient } from '@/services/apiClient';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts';
import { formatNewsPublishedAt, getNewsEventTimestampSeconds } from '@/app/utils/newsDates';

interface NewsItem {
  id: number;
  title: string;
  source: string;
  date: string;
  published_at_source?: string;
  category: string;
  prediction: string;
  confidence: number;
  created_at?: string;
  content?: string;
  article_content?: string;
  summary?: string;
  url?: string;
  source_url?: string;
  link?: string;
}

const CARDS_PER_PAGE = 6;
const CHART_COLORS = ['#ef4444', '#10b981'];
const CHART_AXIS_TICK = { fill: '#cbd5e1', fontSize: 11 };
const CHART_TOOLTIP_STYLE = {
  background: '#0b1220',
  border: '1px solid #334155',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(2, 6, 23, 0.5)',
};
type TrendWindow = '1d' | '24h' | '30m' | '15m';

const WINDOW_CONFIG: Record<TrendWindow, { label: string; rangeMs: number; bucketMs: number }> = {
  '1d': { label: '1 day', rangeMs: 24 * 60 * 60 * 1000, bucketMs: 2 * 60 * 60 * 1000 },
  '24h': { label: '24 hrs', rangeMs: 24 * 60 * 60 * 1000, bucketMs: 60 * 60 * 1000 },
  '30m': { label: '30 mins', rangeMs: 30 * 60 * 1000, bucketMs: 5 * 60 * 1000 },
  '15m': { label: '15 mins', rangeMs: 15 * 60 * 1000, bucketMs: 60 * 1000 },
};

function formatPublishedAt(item: NewsItem): string {
  return formatNewsPublishedAt(item);
}

export function UserNewsMonitoringPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  const [newsData, setNewsData] = useState<NewsItem[]>([]);
  const [detailById, setDetailById] = useState<Record<number, NewsItem>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [trendWindow, setTrendWindow] = useState<TrendWindow>('24h');
  const [nowTs, setNowTs] = useState(() => Date.now());

  const fetchNews = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const result = await apiClient.getNews(1, 100);
      if (result.success && result.data) {
        setNewsData(result.data.items as NewsItem[]);
      } else {
        setNewsData([]);
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(true);
  }, []);

  useEffect(() => {
    const refresh = setInterval(() => {
      fetchNews(false);
    }, 30000);
    return () => clearInterval(refresh);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNowTs(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const filteredNews = useMemo(() => {
    return newsData.filter((item) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.source.toLowerCase().includes(q) ||
        (item.category || '').toLowerCase().includes(q) ||
        String(item.source_url || item.url || item.link || '').toLowerCase().includes(q) ||
        String(item.summary || item.content || item.article_content || '').toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || item.prediction === statusFilter;

      if (dateFilter === 'all') {
        return matchesSearch && matchesStatus;
      }

      const articleTsSeconds = getNewsEventTimestampSeconds(item);
      const articleDate = new Date(articleTsSeconds ? articleTsSeconds * 1000 : 0);
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - articleDate.getTime()) / (1000 * 60 * 60 * 24));

      const matchesDate =
        (dateFilter === 'today' && diffDays === 0) ||
        (dateFilter === 'week' && diffDays <= 7) ||
        (dateFilter === 'month' && diffDays <= 30);

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [newsData, searchQuery, statusFilter, dateFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedArticle(null);
  }, [searchQuery, dateFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredNews.length / CARDS_PER_PAGE));
  const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
  const visibleNews = filteredNews.slice(startIndex, startIndex + CARDS_PER_PAGE);

  const trendData = useMemo(() => {
    const config = WINDOW_CONFIG[trendWindow];
    const startTs = nowTs - config.rangeMs;
	    const bucketMap = new Map<number, { label: string; hoax: number; legitimate: number }>();

	    const toTs = (item: NewsItem): number => {
	      const tsSeconds = getNewsEventTimestampSeconds(item);
	      return tsSeconds ? tsSeconds * 1000 : Number.NaN;
	    };

    const formatLabel = (bucketStart: number): string => {
      const d = new Date(bucketStart);
      if (trendWindow === '30m' || trendWindow === '15m' || trendWindow === '24h') {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    filteredNews.forEach((item) => {
      const ts = toTs(item);
      if (Number.isNaN(ts) || ts < startTs || ts > nowTs) return;

      const bucketStart = Math.floor(ts / config.bucketMs) * config.bucketMs;
      if (!bucketMap.has(bucketStart)) {
        bucketMap.set(bucketStart, { label: formatLabel(bucketStart), hoax: 0, legitimate: 0 });
      }

      const bucket = bucketMap.get(bucketStart);
      if (!bucket) return;

      if (item.prediction === 'Hoax') {
        bucket.hoax += 1;
      } else {
        bucket.legitimate += 1;
      }
    });

    return Array.from(bucketMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, value]) => value);
  }, [filteredNews, trendWindow, nowTs]);

  const predictionData = useMemo(() => {
    const hoax = filteredNews.filter((item) => item.prediction === 'Hoax').length;
    const legitimate = filteredNews.filter((item) => item.prediction === 'Legitimate').length;
    return [
      { name: 'Hoax', value: hoax },
      { name: 'Legitimate', value: legitimate },
    ];
  }, [filteredNews]);

  const getFullContent = (item: NewsItem) =>
    item.content || item.article_content || item.summary || 'No detailed article content available for this record.';

  const getSourceLink = (item: NewsItem) => item.source_url || item.url || item.link || '';

  const handleToggleDetails = async (item: NewsItem) => {
    if (selectedArticle === item.id) {
      setSelectedArticle(null);
      return;
    }

    setSelectedArticle(item.id);

    if (detailById[item.id]) return;

    try {
      setLoadingDetailId(item.id);
      const result = await apiClient.getNewsDetail(item.id);
      if (result.success && result.data) {
        const payload = result.data as Record<string, unknown>;
        const detail = (payload.item || payload.news || payload) as NewsItem;
        setDetailById((prev) => ({ ...prev, [item.id]: { ...item, ...detail } }));
      } else {
        setDetailById((prev) => ({ ...prev, [item.id]: item }));
      }
    } catch {
      setDetailById((prev) => ({ ...prev, [item.id]: item }));
    } finally {
      setLoadingDetailId(null);
    }
  };

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-200 text-lg font-bold">Loading news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text mb-2">
            News Monitoring
          </h1>
          <p className="text-slate-300 text-lg font-semibold">
            Browse analyzed news articles with hoax detection results
          </p>
        </div>

        <div className="border border-slate-700 bg-slate-900/80 rounded-xl p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-300 mb-2">Search Articles</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Enter keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 px-4 py-2.5 pr-10 rounded-lg text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Date Range</label>
              <div className="relative">
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 px-4 py-2.5 pr-10 rounded-lg text-slate-100 focus:border-cyan-400 focus:outline-none appearance-none"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-300 mb-2">Status</label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 px-4 py-2.5 pr-10 rounded-lg text-slate-100 focus:border-cyan-400 focus:outline-none appearance-none"
                >
                  <option value="all">All Articles</option>
                  <option value="Hoax">Hoax Only</option>
                  <option value="Legitimate">Legitimate Only</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {visibleNews.map((item) => (
            <div key={item.id} className="border border-slate-700 bg-slate-900/80 rounded-xl hover:border-cyan-400/30 transition-colors">
              <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                  <div className="xl:col-span-8">
                    <h3 className="text-xl text-slate-100 font-extrabold mb-3 leading-snug">{item.title}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-300 font-medium">
                      <span>
                        <span className="font-bold">Source:</span> {item.source}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Published Date: {formatPublishedAt(item)}
                      </span>
                      <span>
                        <span className="font-bold">Category:</span> {item.category}
                      </span>
                    </div>
                  </div>

                  <div className="xl:col-span-4 flex flex-col xl:items-end gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full xl:w-auto">
                      <div
                        className={`px-5 py-2 rounded-lg border text-sm font-bold ${
                          item.prediction === 'Hoax'
                            ? 'border-red-500/40 bg-red-500/20 text-red-300'
                            : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {item.prediction}
                      </div>
                    </div>

                    <button
                      onClick={() => handleToggleDetails(item)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 hover:bg-slate-700 text-sm text-slate-200 font-semibold"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{item.id === selectedArticle ? 'Hide Details' : 'View Details'}</span>
                    </button>
                  </div>
                </div>

                {selectedArticle === item.id && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    {loadingDetailId === item.id ? (
                      <p className="text-slate-300 text-sm font-medium">Loading article details...</p>
                    ) : (
                      <div className="space-y-3">
                        <h4 className="text-sm uppercase tracking-wide font-bold text-cyan-300">Article Content</h4>
                        <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-line">
                          {getFullContent(detailById[item.id] || item)}
                        </p>
                        {getSourceLink(detailById[item.id] || item) && (
                          <a
                            href={getSourceLink(detailById[item.id] || item)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 text-sm font-semibold"
                          >
                            Open source article
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 border border-slate-700 bg-slate-900/70 rounded-xl px-4 py-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            Showing {filteredNews.length === 0 ? 0 : startIndex + 1}-{Math.min(startIndex + CARDS_PER_PAGE, filteredNews.length)} of {filteredNews.length} articles
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-slate-300 font-semibold px-2">Page {currentPage} / {totalPages}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-2 rounded-lg border border-slate-600 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="border border-slate-700 bg-slate-900/80 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h3 className="text-lg font-extrabold text-white">Live Trend (Current Filter)</h3>
              <select
                value={trendWindow}
                onChange={(e) => setTrendWindow(e.target.value as TrendWindow)}
                className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                {Object.entries(WINDOW_CONFIG).map(([key, cfg]) => (
                  <option key={key} value={key}>{cfg.label}</option>
                ))}
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={CHART_AXIS_TICK}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    tick={CHART_AXIS_TICK}
                    axisLine={{ stroke: '#334155' }}
                    tickLine={{ stroke: '#334155' }}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    labelStyle={{ color: '#f8fafc', fontWeight: 700 }}
                    itemStyle={{ color: '#e2e8f0', fontWeight: 600 }}
                  />
                  <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
                  <Bar dataKey="hoax" name="Hoax" fill="#f43f5e" radius={[8, 8, 0, 0]} barSize={20} />
                  <Bar dataKey="legitimate" name="Legitimate" fill="#10b981" radius={[8, 8, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="border border-slate-700 bg-slate-900/80 rounded-xl p-5">
            <h3 className="text-lg font-extrabold text-white mb-4">Live Hoax vs Legitimate</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={predictionData} dataKey="value" nameKey="name" outerRadius={92} innerRadius={46} paddingAngle={2}>
                    {predictionData.map((entry, index) => (
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



