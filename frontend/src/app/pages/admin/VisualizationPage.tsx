import { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertCircle, BarChart3, PieChart as PieChartIcon, TrendingUp } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { buildSourceData, buildTrendData } from '@/app/utils/statisticsChartData';

interface DailyTrendItem {
  date: string;
  prediction: string;
  count: number;
}

interface CategoryItem {
  category: string;
  count: number;
  avg_confidence: number;
}

interface StatsData {
  daily_trend: DailyTrendItem[];
  categories: CategoryItem[];
  totals: {
    total_articles: number;
    hoax_count: number;
    legitimate_count: number;
    avg_confidence: number;
  };
  sources?: Array<{
    source: string;
    total_count: number;
    hoax_count: number;
    legitimate_count: number;
    avg_confidence: number;
  }>;
}

const PIE_COLORS = ['#06b6d4', '#f97316', '#22c55e', '#a855f7', '#eab308', '#3b82f6'];
const CHART_AXIS_TICK = { fill: '#cbd5e1', fontSize: 11 };
const CHART_TOOLTIP_STYLE = {
  background: '#0b1220',
  border: '1px solid #334155',
  borderRadius: '12px',
  boxShadow: '0 8px 24px rgba(2, 6, 23, 0.5)',
};

export function VisualizationPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const fetchSeq = useRef(0);

  const fetchData = async (range: 7 | 30 | 90) => {
    const seq = ++fetchSeq.current;
    setLoading(true);
    setError(null);
    const statsRes = await apiClient.getRecentStatistics(range);

    if (seq !== fetchSeq.current) return;

    if (statsRes.success && statsRes.data) {
      setStats(statsRes.data as StatsData);
    } else {
      setError(statsRes.error || 'Failed to load visualization data');
      setStats(null);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData(days);
  }, [days]);

  const trendData = useMemo(() => buildTrendData(stats?.daily_trend || []), [stats]);

  const sourceData = useMemo(() => {
    return buildSourceData(stats?.sources || [], { topN: 10, minTotal: 1 });
  }, [stats]);

  const pieData = (stats?.categories || [])
    .map((c) => ({ name: c.category || 'General', value: c.count }))
    .filter((c) => c.value > 0);

  const hasAnyArticles = Boolean((stats?.totals?.total_articles || 0) > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <TrendingUp className="w-16 h-16 text-cyan-400 animate-pulse mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Rendering visual analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Data Visualization
          </h1>
          <p className="text-slate-400 text-lg">Backend-driven trend, source, and category visual intelligence</p>
        </div>
          <div className="flex flex-wrap gap-2">
          {[7, 30, 90].map((range) => (
            <button
              key={range}
              onClick={() => setDays(range as 7 | 30 | 90)}
              className={`px-4 py-2 rounded-lg border text-sm ${
                days === range
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {range} Days
            </button>
          ))}
        </div>
      </div>

      {error && (
        <Alert className="mb-6 border-red-500/30 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {!error && !hasAnyArticles && (
        <Alert className="mb-6 border-slate-700 bg-slate-900/40">
          <AlertCircle className="h-4 w-4 text-cyan-300" />
          <AlertDescription className="text-slate-300">
            No articles found for the last {days} days. Try switching the time range.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Detection Trend</h2>
          </div>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" />
                <XAxis dataKey="date" tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                <YAxis tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f8fafc', fontWeight: 700 }} itemStyle={{ color: '#e2e8f0', fontWeight: 600 }} />
                <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
                <Line type="monotone" dataKey="hoax" name="Hoax" stroke="#f43f5e" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="legitimate" name="Legitimate" stroke="#22d3ee" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
              No trend data available for the selected period.
            </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Category Distribution</h2>
          </div>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={92}
                  innerRadius={38}
                  label={false}
                  labelLine={false}
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f8fafc', fontWeight: 700 }} itemStyle={{ color: '#e2e8f0', fontWeight: 600 }} />
                <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm">
              No category data available for the selected period.
            </div>
          )}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">Top Sources (Selected Period)</h2>
          </div>
        {sourceData.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={sourceData}>
              <CartesianGrid strokeDasharray="4 4" stroke="#1e293b" vertical={false} />
              <XAxis dataKey="source" tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} interval={0} angle={-14} textAnchor="end" height={60} />
              <YAxis tick={CHART_AXIS_TICK} axisLine={{ stroke: '#334155' }} tickLine={{ stroke: '#334155' }} />
              <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelStyle={{ color: '#f8fafc', fontWeight: 700 }} itemStyle={{ color: '#e2e8f0', fontWeight: 600 }} />
              <Legend wrapperStyle={{ color: '#e2e8f0', fontSize: '12px', fontWeight: 600 }} />
              <Bar dataKey="hoaxCount" name="Hoax" stackId="total" fill="#f97316" radius={[8, 8, 0, 0]} barSize={28} />
              <Bar dataKey="legitimateCount" name="Legitimate" stackId="total" fill="#22d3ee" radius={[8, 8, 0, 0]} barSize={28} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[340px] flex items-center justify-center text-slate-400 text-sm">
            No source data available for the selected period.
          </div>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-sm">Articles</p>
            <p className="text-3xl font-bold text-white mt-2">{stats.totals.total_articles}</p>
          </div>
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-sm">Hoax</p>
            <p className="text-3xl font-bold text-orange-400 mt-2">{stats.totals.hoax_count}</p>
          </div>
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-sm">Legitimate</p>
            <p className="text-3xl font-bold text-cyan-400 mt-2">{stats.totals.legitimate_count}</p>
          </div>
          <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-5">
            <p className="text-slate-400 text-sm">Avg Confidence</p>
            <p className="text-3xl font-bold text-white mt-2">{(stats.totals.avg_confidence * 100).toFixed(1)}%</p>
          </div>
        </div>
      )}
    </div>
  );
}



