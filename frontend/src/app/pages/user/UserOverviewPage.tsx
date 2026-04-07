import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Clock3, Eye, Loader2, Newspaper, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface AnalysisItem {
  id: number;
  created_at: string;
  title?: string;
  prediction?: 'Hoax' | 'Legitimate';
  confidence?: number;
}

interface Totals {
  total_articles: number;
  hoax_count: number;
  legitimate_count: number;
  avg_confidence: number;
  hoax_percentage: number;
}

export function UserOverviewPage() {
  const ANALYSES_PER_PAGE = 5;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisItem[]>([]);
  const [analysisPage, setAnalysisPage] = useState(1);
  const [totals, setTotals] = useState<Totals>({
    total_articles: 0,
    hoax_count: 0,
    legitimate_count: 0,
    avg_confidence: 0,
    hoax_percentage: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      const [analysisResult, statsResult] = await Promise.all([
        apiClient.getUserAnalysisHistory(1, 50),
        apiClient.getRecentStatistics(30),
      ]);

      if (analysisResult.success && analysisResult.data) {
        setAnalyses(analysisResult.data as AnalysisItem[]);
      } else {
        setError(analysisResult.error || 'Failed to load analysis history');
      }

      if (statsResult.success && statsResult.data) {
        const stats = statsResult.data as { totals: Totals };
        setTotals(stats.totals);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const totalAnalysisPages = useMemo(
    () => Math.max(1, Math.ceil(analyses.length / ANALYSES_PER_PAGE)),
    [analyses]
  );

  const recentAnalyses = useMemo(() => {
    const start = (analysisPage - 1) * ANALYSES_PER_PAGE;
    return analyses.slice(start, start + ANALYSES_PER_PAGE);
  }, [analyses, analysisPage]);

  useEffect(() => {
    if (analysisPage > totalAnalysisPages) setAnalysisPage(totalAnalysisPages);
  }, [analysisPage, totalAnalysisPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text mb-2">
          Dashboard Overview
        </h1>
        <p className="text-slate-300 text-lg font-semibold">Your activity, detection trend, and confidence insights</p>
      </div>

      {error && (
        <div className="mb-6 border border-red-500/30 bg-red-500/10 rounded-lg p-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8 items-stretch">
        {[
          { label: 'Your Analyses', value: analyses.length, icon: Eye, color: 'from-blue-600 to-cyan-600' },
          { label: 'Global Hoax (30d)', value: totals.hoax_count, icon: AlertTriangle, color: 'from-red-600 to-orange-600' },
          { label: 'Legitimate (30d)', value: totals.legitimate_count, icon: Newspaper, color: 'from-green-600 to-emerald-600' },
          { label: 'Avg Confidence', value: `${Math.round(totals.avg_confidence * 100)}%`, icon: BarChart3, color: 'from-purple-600 to-pink-600' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="relative group">
              <div className={`absolute -inset-0.5 bg-gradient-to-r ${item.color} rounded-xl blur opacity-20 group-hover:opacity-35 transition`} />
              <div className="relative h-full min-h-[140px] bg-slate-900/80 border border-slate-700 rounded-xl p-6 hover:border-cyan-400/40 transition">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-slate-300 text-sm font-bold">{item.label}</span>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-white">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900/80 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-extrabold text-white">Recent Analysis Activity</h2>
            <span className="text-xs text-slate-300 font-semibold">Page {analysisPage} / {totalAnalysisPages}</span>
          </div>
          <div className="space-y-3">
            {recentAnalyses.length > 0 ? recentAnalyses.map((entry) => (
              <div key={entry.id} className="border border-slate-700 bg-slate-800/40 rounded-lg p-4 hover:border-cyan-500/40 transition">
                <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-bold text-slate-100">{entry.title || `Analysis #${entry.id}`}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <span className={`px-3 py-1 rounded-md text-xs font-semibold ${
                      entry.prediction === 'Hoax' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {entry.prediction || 'Unknown'}
                    </span>
                    <p className="text-xs text-slate-400 mt-2">{Math.round((entry.confidence || 0) * 100)}%</p>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-slate-400 text-sm">No analysis records yet.</p>
            )}
          </div>
          <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-700 pt-4">
            <p className="text-xs text-slate-400 font-medium">Limited to {ANALYSES_PER_PAGE} cards per page</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAnalysisPage((prev) => Math.max(1, prev - 1))}
                disabled={analysisPage === 1}
                className="px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev
              </button>
              <button
                type="button"
                onClick={() => setAnalysisPage((prev) => Math.min(totalAnalysisPages, prev + 1))}
                disabled={analysisPage === totalAnalysisPages}
                className="px-3 py-1.5 rounded-md border border-slate-600 text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Detection Ratio</h2>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-slate-300 mb-2">
              <span>Hoax share (30 days)</span>
              <span>{totals.hoax_percentage}%</span>
            </div>
            <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${Math.min(100, totals.hoax_percentage)}%` }} />
            </div>
          </div>
          <div className="pt-4 border-t border-slate-700">
            <div className="flex items-center gap-2 text-slate-300 text-sm mb-2">
              <Clock3 className="w-4 h-4 text-cyan-300" />
              <span>Last data sync: just now</span>
            </div>
            <p className="text-xs text-slate-500">
              Statistics use the latest available API snapshots and refresh when this page loads.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}



