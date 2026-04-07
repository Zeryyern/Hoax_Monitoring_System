import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { buildSourceData, buildTrendData } from '@/app/utils/statisticsChartData';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

interface PredictionItem {
  prediction: string;
  count: number;
  avg_confidence: number;
}

interface CategoryItem {
  category: string;
  count: number;
  avg_confidence: number;
}

interface DailyItem {
  date: string;
  prediction: string;
  count: number;
}

interface StatsResponse {
  totals: {
    total_articles: number;
    hoax_count: number;
    legitimate_count: number;
    avg_confidence: number;
    hoax_percentage: number;
  };
  predictions: PredictionItem[];
  categories: CategoryItem[];
  daily_trend: DailyItem[];
  sources?: Array<{
    source: string;
    total_count: number;
    hoax_count: number;
    legitimate_count: number;
    avg_confidence: number;
  }>;
}

const PIE_COLORS = ['#06b6d4', '#3b82f6', '#22c55e', '#a855f7', '#eab308', '#f97316', '#f43f5e'];
const CHART_AXIS_TICK = { fill: '#cbd5e1', fontSize: 11 };
const CHART_TOOLTIP_STYLE = {
  background: '#0b1220',
  border: '1px solid #334155',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(2, 6, 23, 0.5)',
};

export function UserAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<StatsResponse | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const statsRes = await apiClient.getRecentStatistics(30);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data as StatsResponse);
      } else {
        setError(statsRes.error || 'Failed to load analytics');
      }

      setLoading(false);
    };
    load();
  }, []);

  const trendData = useMemo(() => {
    return buildTrendData(stats?.daily_trend || []);
  }, [stats]);

  const categoryData = useMemo(
    () =>
      (stats?.categories || [])
        .map((c) => ({ name: c.category || 'General', value: c.count }))
        .filter((c) => c.value > 0),
    [stats]
  );

  const topHoaxSources = useMemo(() => {
    return buildSourceData(stats?.sources || [], { topN: 20, minTotal: 1 })
      .map((item) => ({ source: item.source, hoaxCount: item.hoaxCount }))
      .filter((item) => item.hoaxCount > 0)
      .sort((a, b) => b.hoaxCount - a.hoaxCount || a.source.localeCompare(b.source))
      .slice(0, 6);
  }, [stats]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-16 h-16 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading analytics dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-slate-400 text-lg">Detection trend, category distribution, and key statistics</p>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-lg border border-slate-600 bg-slate-800 text-slate-300 w-fit">
          View-Only Mode
        </span>
      </div>

      {error && (
        <div className="mb-6 border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-red-300 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          {error}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8 items-stretch">
            <div className="h-full min-h-[130px] bg-slate-900/80 border border-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Total Articles</p>
              <p className="text-3xl font-bold text-white mt-2">{stats.totals.total_articles}</p>
              <p className="text-xs text-slate-500 mt-2">Last 30 days</p>
            </div>
            <div className="h-full min-h-[130px] bg-slate-900/80 border border-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Hoax Detection Rate</p>
              <p className="text-3xl font-bold text-red-300 mt-2">{stats.totals.hoax_percentage}%</p>
              <p className="text-xs text-slate-500 mt-2">Hoax vs total</p>
            </div>
            <div className="h-full min-h-[130px] bg-slate-900/80 border border-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Legitimate</p>
              <p className="text-3xl font-bold text-emerald-300 mt-2">{stats.totals.legitimate_count}</p>
              <p className="text-xs text-slate-500 mt-2">Verified items</p>
            </div>
            <div className="h-full min-h-[130px] bg-slate-900/80 border border-slate-700 rounded-xl p-6">
              <p className="text-slate-400 text-sm">Average Confidence</p>
              <p className="text-3xl font-bold text-cyan-300 mt-2">{Math.round(stats.totals.avg_confidence * 100)}%</p>
              <p className="text-xs text-slate-500 mt-2">Model score</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-cyan-300" />
                  Detection Trend (Last 30 Days)
                </h2>
	              </div>
	              <div className="h-72">
	                {trendData.length > 0 ? (
	                  <ResponsiveContainer width="100%" height="100%">
	                    <LineChart data={trendData}>
	                      <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
	                      <XAxis dataKey="date" tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
	                      <YAxis tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
	                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f8fafc', fontWeight: 700 }} itemStyle={{ color: '#e2e8f0', fontWeight: 600 }} />
	                      <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
	                      <Line type="monotone" dataKey="hoax" name="Hoax" stroke="#f43f5e" strokeWidth={3} dot={false} />
	                      <Line type="monotone" dataKey="legitimate" name="Legitimate" stroke="#22d3ee" strokeWidth={3} dot={false} />
	                    </LineChart>
	                  </ResponsiveContainer>
	                ) : (
	                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
	                    No trend data available.
	                  </div>
	                )}
	              </div>
	            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
                <PieChartIcon className="w-5 h-5 text-cyan-300" />
                Category Distribution
	              </h2>
	              <div className="h-72">
	                {categoryData.length > 0 ? (
	                  <ResponsiveContainer width="100%" height="100%">
	                    <PieChart>
	                      <Pie
	                        data={categoryData}
	                        dataKey="value"
	                        nameKey="name"
	                        cx="50%"
	                        cy="50%"
	                        outerRadius={95}
	                        innerRadius={42}
	                        label={false}
	                        labelLine={false}
	                      >
	                        {categoryData.map((_, index) => (
	                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
	                        ))}
	                      </Pie>
	                      <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f8fafc', fontWeight: 700 }} itemStyle={{ color: '#e2e8f0', fontWeight: 600 }} />
	                      <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
	                    </PieChart>
	                  </ResponsiveContainer>
	                ) : (
	                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
	                    No category data available.
	                  </div>
	                )}
	              </div>
	            </div>
	          </div>

          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-300" />
              Top Sources (Hoax Content)
	            </h2>
	            <div className="h-72">
	              {topHoaxSources.length > 0 ? (
	                <ResponsiveContainer width="100%" height="100%">
	                  <BarChart data={topHoaxSources}>
	                    <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
	                    <XAxis dataKey="source" tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} interval={0} angle={-14} textAnchor="end" height={60} />
	                    <YAxis tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
	                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f8fafc', fontWeight: 700 }} itemStyle={{ color: '#e2e8f0', fontWeight: 600 }} />
	                    <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
	                    <Bar dataKey="hoaxCount" name="Hoax Articles" fill="#f97316" radius={[8, 8, 0, 0]} barSize={30} />
	                  </BarChart>
	                </ResponsiveContainer>
	              ) : (
	                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
	                  No hoax sources available.
	                </div>
	              )}
	            </div>
	          </div>
        </>
      )}
    </div>
  );
}
