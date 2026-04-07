import { useState, useEffect } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { AlertTriangle, TrendingUp, Users, AlertCircle, Eye, RefreshCw } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface DashboardStats {
  statistics: {
    total_news: number;
    hoax_count: number;
    legitimate_count: number;
    user_count: number;
    avg_confidence: number;
    hoax_percentage: number;
  };
  recent_news: any[];
  category_distribution: any[];
  period_days?: number;
}

function normalizeDateInput(value: any): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // SQLite CURRENT_TIMESTAMP is commonly `YYYY-MM-DD HH:MM:SS`, which is not
  // consistently parsed by `Date` across browsers. Convert to ISO-ish.
  if (raw.length >= 19 && raw[10] === ' ' && !raw.includes('T')) {
    return `${raw.slice(0, 10)}T${raw.slice(11, 19)}`;
  }
  return raw;
}

function sortRecentNews(recent: any[]): any[] {
  return [...(recent || [])].sort((a: any, b: any) => {
    // Do not use created_at (scrape/insert time) as a substitute for source publication.
    const aRaw = a?.published_at_source || a?.date || '';
    const bRaw = b?.published_at_source || b?.date || '';
    const aTs = new Date(normalizeDateInput(aRaw) || 0).getTime();
    const bTs = new Date(normalizeDateInput(bRaw) || 0).getTime();
    return bTs - aTs;
  });
}

function formatPublishedAt(news: any): string {
  const raw = news?.published_at_source || news?.date || '';
  if (!raw) return 'Unknown';
  const parsed = new Date(normalizeDateInput(raw));
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleString();
  }
  return String(raw);
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getAdminDashboard(30);
      if (result.success && result.data) {
        setStats(result.data as DashboardStats);
      } else {
        setError(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 sm:p-6 md:p-8">
        <Alert className="border-red-500/30 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) {
    return <div className="text-white">No data available</div>;
  }

  const { statistics, recent_news, category_distribution } = stats;
  const periodDays = stats.period_days || 30;
  const sortedRecentNews = sortRecentNews(recent_news);

  // Prepare chart data
  const predictionData = [
    { name: 'Hoax', value: statistics.hoax_count, fill: '#ef4444' },
    { name: 'Legitimate', value: statistics.legitimate_count, fill: '#22c55e' },
  ];

  const categoryData = category_distribution.map((cat: any) => ({
    name: cat.category || 'Unknown',
    count: cat.count,
    confidence: (cat.avg_conf * 100).toFixed(1),
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  const CHART_TOOLTIP_STYLE = {
    background: '#0b1220',
    border: '1px solid #334155',
    borderRadius: '12px',
    boxShadow: '0 8px 24px rgba(2, 6, 23, 0.5)',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Admin Dashboard</h1>
        <p className="text-slate-400 text-lg">Monitor system health and hoax detection statistics in real-time</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8 items-stretch">
        {/* Total Articles Card */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative h-full min-h-[150px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Articles</p>
                  <p className="text-4xl font-bold text-white mt-2">{statistics.total_news}</p>
                  <p className="text-xs text-slate-500 mt-2">Analyzed in last {periodDays} days</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <Eye className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hoax Detected Card */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative h-full min-h-[150px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-red-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Hoax Detected</p>
                  <p className="text-4xl font-bold text-red-400 mt-2">{statistics.hoax_count}</p>
                  <p className="text-xs text-red-400/70 mt-2">{statistics.hoax_percentage.toFixed(1)}% of total</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-red-600 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-red-500/50">
                  <AlertTriangle className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Legitimate Card */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative h-full min-h-[150px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Legitimate</p>
                  <p className="text-4xl font-bold text-green-400 mt-2">{statistics.legitimate_count}</p>
                  <p className="text-xs text-green-400/70 mt-2">Verified content</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/50">
                  <TrendingUp className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative h-full min-h-[150px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Active Users</p>
                  <p className="text-4xl font-bold text-purple-400 mt-2">{statistics.user_count}</p>
                  <p className="text-xs text-purple-400/70 mt-2">Registered accounts</p>
                </div>
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <Users className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Prediction Distribution */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300">
              <h2 className="text-lg font-bold text-white mb-4">Prediction Distribution</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={predictionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={90}
                    innerRadius={38}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {predictionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f8fafc', fontWeight: 700 }} itemStyle={{ color: '#e2e8f0', fontWeight: 600 }} />
                  <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Avg Confidence */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-300"></div>
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-orange-500/50 transition-all duration-300">
              <h2 className="text-lg font-bold text-white mb-4">Model Confidence Score</h2>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-orange-600 to-yellow-600 opacity-10"></div>
                  <div className="text-5xl font-bold text-transparent bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text">
                    {(statistics.avg_confidence * 100).toFixed(0)}%
                  </div>
                </div>
                <p className="text-slate-400 mt-4 font-medium">Average prediction confidence</p>
                <div className="w-full bg-slate-700 rounded-full h-3 mt-4">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 transition-all duration-500"
                    style={{ width: `${statistics.avg_confidence * 100}%` }}
                  ></div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Range: 0% - 100%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Distribution */}
      <div className="group animate-slide-up mb-8" style={{ animationDelay: '0.7s' }}>
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition-all duration-300">
            <h2 className="text-lg font-bold text-white mb-6">Category Distribution</h2>
            {categoryData.length > 0 ? (
              <div className="space-y-4">
                {categoryData.map((cat: any, idx: number) => (
                  <div key={idx} className="group/item hover:bg-slate-700/50 transition-all duration-300 p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-white">{cat.name}</span>
                      <span className="text-sm text-slate-400">{cat.count} articles</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-slate-700 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${
                            idx % 2 === 0 ? 'from-blue-500 to-cyan-500' : 'from-purple-500 to-pink-500'
                          }`}
                          style={{ width: `${(cat.count / statistics.total_news) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-slate-400 w-10 text-right">
                        {((cat.count / statistics.total_news) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Avg confidence: <span className="text-slate-300 font-semibold">{cat.confidence}%</span></p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 py-4">No category data available</p>
            )}
          </div>
        </div>
      </div>

	      {/* Recent Articles */}
	      <div className="group animate-slide-up mb-8" style={{ animationDelay: '0.8s' }}>
	        <div className="relative">
	          <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-300"></div>
	          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-pink-500/50 transition-all duration-300">
	            <h2 className="text-lg font-bold text-white mb-6">Latest Articles</h2>
	            {sortedRecentNews.length > 0 ? (
	              <div className="space-y-3">
	                {sortedRecentNews.map((news: any, idx: number) => (
	                  <div key={idx} className="border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-all duration-300 p-4 rounded-lg group/article hover:border-slate-600">
	                  <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
	                      <div className="flex-1">
	                        <h3 className="font-semibold text-slate-200 line-clamp-2 group-hover/article:text-white transition-colors">
	                          {news.title || 'Untitled article'}
	                        </h3>
	                        <p className="text-xs text-slate-500 mt-2">Published: {formatPublishedAt(news)}</p>
	                      </div>
	                      <div className="ml-4 text-right flex-shrink-0">
	                        <span
	                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                            news.prediction === 'Hoax'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-green-500/20 text-green-300 border border-green-500/30'
                          }`}
                        >
                          {news.prediction}
                        </span>
                        <p className="text-sm text-slate-400 mt-2 font-semibold">{(news.confidence * 100).toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 py-4">No recent articles</p>
            )}
          </div>
        </div>
      </div>

      {/* Refresh Button */}
      <div className="flex justify-stretch sm:justify-end animate-slide-up" style={{ animationDelay: '0.9s' }}>
        <button
          onClick={fetchDashboardData}
          className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Data
        </button>
      </div>

      {/* CSS for animations */}
      <style>{`
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



