import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertCircle, Clock3, Pause, Play, RefreshCw, Server, Trash2, Zap } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface SourceItem {
  source_key: string;
  source_name: string;
  available: boolean;
  is_running: boolean;
  interval_seconds: number;
  max_runtime_seconds?: number;
  started_at: string | null;
  loop_last_run_at: string | null;
  last_run_time: string | null;
  last_status: string;
  last_collected: number;
  last_error?: string | null;
  last_success_run_time?: string | null;
  last_success_collected?: number;
  scraper_total_articles?: number;
  total_articles?: number;
}

interface ScrapingStatus {
  is_running: boolean;
  interval_seconds: number;
  max_runtime_seconds?: number;
  started_at: string | null;
  last_run_at: string | null;
  import_error?: string | null;
  sources: SourceItem[];
  last_summary?: {
    total_collected?: number;
    total_inserted_news_db?: number;
    total_inserted_scraper_db?: number;
  };
}

const SOURCE_REGISTRY = [
  {
    source_key: 'turnbackhoax',
    source_name: 'TurnBackHoax',
    region: 'Community Fact-Check',
  },
  {
    source_key: 'antaranews',
    source_name: 'Antara Anti-Hoax',
    region: 'National Wire',
  },
  {
    source_key: 'kompas_cekfakta',
    source_name: 'Kompas Cek Fakta',
    region: 'Newsroom Fact-Check',
  },
  {
    source_key: 'detik_hoax',
    source_name: 'Detik Hoax or Not',
    region: 'Digital News Verification',
  },
  {
    source_key: 'tempo_hoax',
    source_name: 'Tempo Hoax',
    region: 'Editorial Verification',
  },
];

const RUNTIME_PRESETS: Array<{ label: string; seconds: number }> = [
  { label: '30 minutes', seconds: 30 * 60 },
  { label: '1 hour', seconds: 60 * 60 },
  { label: '2 hours', seconds: 2 * 60 * 60 },
  { label: '4 hours', seconds: 4 * 60 * 60 },
  { label: '8 hours', seconds: 8 * 60 * 60 },
  { label: '10 hours (Max)', seconds: 10 * 60 * 60 },
];

export function ScrapingPage() {
  const [status, setStatus] = useState<ScrapingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [intervalSeconds, setIntervalSeconds] = useState(300);
  const [maxRuntimeSeconds, setMaxRuntimeSeconds] = useState(10 * 60 * 60);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string | null>(null);
  const fetchStatus = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    const result = await apiClient.getScrapingStatus();
    if (result.success && result.data) {
      const data = result.data as ScrapingStatus;
      setStatus(data);
      setIntervalSeconds(data.interval_seconds || 300);
      setLastRefreshedAt(new Date().toLocaleTimeString());
    } else {
      setError(result.error || 'Failed to load scraping status');
    }
    if (!silent) {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const shouldPoll = !!status?.is_running;
    if (!shouldPoll) return;
    const poller = window.setInterval(() => {
      fetchStatus(true);
    }, 5000);
    return () => window.clearInterval(poller);
  }, [status?.is_running]);

  const formatDuration = (seconds: number) => {
    const safe = Math.max(0, Math.floor(seconds));
    const h = Math.floor(safe / 3600);
    const m = Math.floor((safe % 3600) / 60);
    const s = safe % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const parseBackendTimestamp = (value: string | null) => {
    if (!value) return Number.NaN;
    const normalized = value.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
    return new Date(normalized).getTime();
  };

  const remainingRuntimeLabel = (startedAt: string | null, maxRuntimeSeconds?: number, running?: boolean) => {
    if (!running || !startedAt || !maxRuntimeSeconds) return 'N/A';
    const started = parseBackendTimestamp(startedAt);
    if (Number.isNaN(started)) return 'N/A';
    const elapsed = Math.max(0, Math.floor((nowMs - started) / 1000));
    const remaining = Math.max(0, maxRuntimeSeconds - elapsed);
    return formatDuration(remaining);
  };

  const elapsedRuntimeLabel = (startedAt: string | null) => {
    if (!startedAt) return 'N/A';
    const started = parseBackendTimestamp(startedAt);
    if (Number.isNaN(started)) return 'N/A';
    const elapsed = Math.max(0, Math.floor((nowMs - started) / 1000));
    return formatDuration(elapsed);
  };

  const handleResetData = () => {
    setShowResetConfirm(true);
  };

  const confirmResetData = async () => {
    setShowResetConfirm(false);
    setActionLoading('reset-data');
    setError(null);
    setSuccess(null);
    try {
      const result = await apiClient.resetScrapedData();
      if (!result.success) {
        setError(result.error || 'Failed to reset scraped data');
      } else {
        const data = (result.data as {
          removed_news?: number;
          removed_user_analysis?: number;
          remaining?: {
            news?: number;
            user_analysis?: number;
            api_source_runs?: number;
            scraper_hoaxes?: number;
            scraper_source_runs?: number;
            scraper_runs?: number;
          };
          cleanup_errors?: string[];
        }) || {};
        const rem = data.remaining || {};
        const remainingSummary = `Remaining -> news:${rem.news || 0}, user_analysis:${rem.user_analysis || 0}, api_source_runs:${rem.api_source_runs || 0}, scraper_hoaxes:${rem.scraper_hoaxes || 0}, scraper_source_runs:${rem.scraper_source_runs || 0}, scraper_runs:${rem.scraper_runs || 0}`;
        setSuccess(
          `Reset complete. Deleted ${data.removed_news || 0} scraped news records and ${data.removed_user_analysis || 0} linked analysis records. ${remainingSummary}`
        );
        if (data.cleanup_errors && data.cleanup_errors.length > 0) {
          setError(`Reset completed with warnings: ${data.cleanup_errors.join(' | ')}`);
        }
      }
      await fetchStatus(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset scraped data');
    } finally {
      setActionLoading(null);
    }
  };

  const runAction = async (key: string, fn: () => Promise<{ success: boolean; error?: string }>) => {
    setActionLoading(key);
    setError(null);
    setSuccess(null);
    try {
      const result = await fn();
      if (!result.success) {
        setError(result.error || 'Action failed');
      }
      await fetchStatus(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const isPending = (key: string) => actionLoading === key;

  const totalCollected = useMemo(
    () => status?.sources.reduce((acc, s) => acc + (s.last_collected || 0), 0) || 0,
    [status]
  );

  const sourcesByKey = useMemo(() => {
    const map = new Map<string, SourceItem>();
    (status?.sources || []).forEach((source) => map.set(source.source_key, source));
    return map;
  }, [status]);

  const sourceControls = useMemo(() => {
    return SOURCE_REGISTRY.map((entry) => {
      const live = sourcesByKey.get(entry.source_key);
      return {
        source_key: entry.source_key,
        source_name: entry.source_name,
        available: live?.available ?? false,
        is_running: live?.is_running ?? false,
        interval_seconds: live?.interval_seconds ?? intervalSeconds,
        max_runtime_seconds: live?.max_runtime_seconds,
        started_at: live?.started_at ?? null,
        loop_last_run_at: live?.loop_last_run_at ?? null,
        last_run_time: live?.last_run_time ?? null,
        last_status: live?.last_status ?? 'N/A',
        last_collected: live?.last_collected ?? 0,
        last_success_run_time: live?.last_success_run_time ?? null,
        last_success_collected: live?.last_success_collected ?? 0,
        scraper_total_articles: live?.scraper_total_articles ?? 0,
        total_articles: live?.total_articles ?? 0,
      } as SourceItem;
    });
  }, [sourcesByKey, intervalSeconds]);

  const chartMax = useMemo(
    () => Math.max(1, ...sourceControls.map((source) => source.total_articles || 0)),
    [sourceControls]
  );

  const activeGlobalStart = status?.is_running ? status.started_at : null;
  const activeGlobalMaxRuntime = status?.max_runtime_seconds ?? maxRuntimeSeconds;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading scraping controls...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Scraping Process
        </h1>
        <p className="text-slate-400 text-lg">Control and monitor all scraper sources from backend runtime</p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-500/30 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/10">
          <AlertCircle className="h-4 w-4 text-emerald-300" />
          <AlertDescription className="text-emerald-200">{success}</AlertDescription>
        </Alert>
      )}

      {!!status?.import_error && (
        <Alert className="mb-6 border-amber-500/30 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-300" />
          <AlertDescription className="text-amber-200">
            Scraper dependency warning: {status.import_error}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8 items-stretch">
        <div className="h-full min-h-[140px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm tracking-wide">Runtime Status</p>
              <p className={`text-3xl font-bold mt-2 ${status?.is_running ? 'text-emerald-400' : 'text-slate-300'}`}>
                {status?.is_running ? 'RUNNING' : 'STOPPED'}
              </p>
              <p className="text-slate-400 text-sm mt-3">
                {status?.is_running ? 'Continuous scraper is active' : 'No scraper is currently running'}
              </p>
            </div>
            <Activity className={`w-8 h-8 ${status?.is_running ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
        </div>
        <div className="h-full min-h-[140px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm tracking-wide">Tracked Sources</p>
              <p className="text-3xl font-bold text-white mt-2">{SOURCE_REGISTRY.length}</p>
              <p className="text-slate-400 text-sm mt-3">Verified hoax source registry</p>
            </div>
            <Server className="w-8 h-8 text-cyan-400" />
          </div>
        </div>
        <div className="h-full min-h-[140px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-sm tracking-wide">Auto-stop Countdown</p>
              <p className="text-3xl font-bold text-white mt-2 tabular-nums">
                {remainingRuntimeLabel(activeGlobalStart, activeGlobalMaxRuntime, !!activeGlobalStart)}
              </p>
              <p className="text-xs text-slate-500 mt-3">
                Max runtime: {formatDuration(activeGlobalMaxRuntime)}
              </p>
            </div>
            <Zap className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 mb-8 shadow-lg shadow-slate-950/20">
        <h2 className="text-lg font-bold text-white mb-4">Verified Hoax Source Registry</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {SOURCE_REGISTRY.map((entry) => {
            const live = sourcesByKey.get(entry.source_key);
            return (
              <div key={entry.source_key} className="border border-slate-700 rounded-lg bg-slate-900/40 p-4 hover:border-slate-600 transition-colors">
                <p className="text-xs text-cyan-300 font-semibold tracking-wide uppercase">{entry.source_key}</p>
                <p className="text-sm text-slate-100 font-semibold mt-1">{entry.source_name}</p>
                <p className="text-xs text-slate-400 mt-1">{entry.region}</p>
                <p className="text-xs mt-3 text-slate-400">
                  Status:{' '}
                  <span className={live?.available ? 'text-emerald-300' : 'text-amber-300'}>
                    {live?.available ? 'Available' : 'Unavailable'}
                  </span>
                </p>
                <p className="text-xs text-slate-500 mt-2">Last Run Collected: {live?.last_collected ?? 0}</p>
                <p className="text-xs text-slate-500">Last Successful: {live?.last_success_collected ?? 0}</p>
                <p className="text-xs text-slate-500">Total Stored (Scraper): {live?.scraper_total_articles ?? 0}</p>
                <p className="text-xs text-slate-500">Total Stored (Dashboard): {live?.total_articles ?? 0}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 mb-8 shadow-lg shadow-slate-950/20">
        <h2 className="text-lg font-bold text-white mb-4">Source Coverage Graph</h2>
        <div className="space-y-3">
          {sourceControls.map((source) => {
            const value = source.total_articles || 0;
            const width = Math.max(2, Math.round((value / chartMax) * 100));
            return (
              <div key={`graph-${source.source_key}`}>
                <div className="flex items-center justify-between text-xs text-slate-300 mb-1">
                  <span>{source.source_name}</span>
                  <span>{value} articles</span>
                </div>
                <div className="h-3 w-full rounded-full bg-slate-700/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-emerald-400"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 mb-8 shadow-lg shadow-slate-950/20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-4">Global Controls</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              <button
                onClick={() =>
                  status?.is_running
                    ? runAction('stop', () => apiClient.stopScraping())
                    : runAction('start', () => apiClient.startScraping(intervalSeconds, maxRuntimeSeconds))
                }
                disabled={!!actionLoading}
                className={`px-5 py-2.5 rounded-lg border disabled:opacity-60 flex items-center gap-2 transition-all ${
                  status?.is_running
                    ? 'border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30'
                    : 'border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30'
                } ${isPending('start') || isPending('stop') ? 'ring-2 ring-cyan-400/50 scale-[0.99]' : ''} ${
                  !!actionLoading && !(isPending('start') || isPending('stop')) ? 'opacity-50' : ''
                }`}
              >
                {isPending('start') || isPending('stop') ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : status?.is_running ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                {isPending('start') ? 'Starting...' : isPending('stop') ? 'Stopping...' : status?.is_running ? 'Stop' : 'Start'}
              </button>
              <button
                onClick={() => runAction('all', () => apiClient.runAllScrapers())}
                disabled={!!actionLoading}
                className={`px-5 py-2.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-60 transition-all ${
                  isPending('all') ? 'ring-2 ring-cyan-400/50 scale-[0.99]' : ''
                }`}
              >
                {isPending('all') ? 'Running All...' : 'Scrape All Sources'}
              </button>
              <button
                onClick={() => runAction('enrich', () => apiClient.enrichRecentNews(30, 200))}
                disabled={!!actionLoading}
                className={`px-5 py-2.5 rounded-lg border border-slate-500/40 bg-slate-500/10 text-slate-100 hover:bg-slate-500/15 disabled:opacity-60 transition-all ${
                  isPending('enrich') ? 'ring-2 ring-cyan-400/50 scale-[0.99]' : ''
                }`}
                title="Re-fetch source pages to correct title/published date/verdict for stored rows (requires network access)."
              >
                {isPending('enrich') ? 'Enriching...' : 'Enrich Recent News'}
              </button>
              <button
                onClick={async () => {
                  setActionLoading('refresh');
                  try {
                    await fetchStatus(true);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Refresh failed');
                  } finally {
                    setActionLoading(null);
                  }
                }}
                disabled={!!actionLoading}
                className={`px-4 py-2.5 rounded-lg border border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 disabled:opacity-60 flex items-center gap-2 transition-all ${
                  isPending('refresh') ? 'ring-2 ring-cyan-400/50 scale-[0.99]' : ''
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${isPending('refresh') ? 'animate-spin' : ''}`} />
                {isPending('refresh') ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleResetData}
                disabled={!!actionLoading}
                className="px-5 py-2.5 rounded-lg border border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Reset Data
              </button>
            </div>
          </div>

		          <div>
		            <h2 className="text-lg font-bold text-white mb-4">Scheduling</h2>
		            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
	              <label className="text-slate-300 text-sm">Interval (seconds)</label>
	              <input
	                type="number"
	                min={30}
		                value={intervalSeconds}
		                onChange={(e) => setIntervalSeconds(Math.max(30, Number(e.target.value) || 30))}
	                className="w-32 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:outline-none focus:border-cyan-400"
	              />
	              <span className="text-xs text-slate-500">Used for Start continuous mode</span>
	            </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 mt-3">
                <label className="text-slate-300 text-sm">Max runtime</label>
                <select
                  value={String(maxRuntimeSeconds)}
                  onChange={(e) => setMaxRuntimeSeconds(Math.max(60, Math.min(10 * 60 * 60, Number(e.target.value) || 10 * 60 * 60)))}
                  className="w-56 px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  {RUNTIME_PRESETS.map((opt) => (
                    <option key={opt.seconds} value={String(opt.seconds)}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">Applies to Start (global) and Start (per-source). Hard cap: 10 hours.</span>
              </div>
		            <div className="mt-4 space-y-1 text-sm text-slate-400">
		              <p className="flex items-center gap-2"><Clock3 className="w-4 h-4" />Started: {status?.started_at ? new Date(status.started_at).toLocaleString() : 'N/A'}</p>
		              <p className="flex items-center gap-2"><Clock3 className="w-4 h-4" />Last run: {status?.last_run_at ? new Date(status.last_run_at).toLocaleString() : 'N/A'}</p>
		              <p className="flex items-center gap-2"><Clock3 className="w-4 h-4" />Elapsed: {elapsedRuntimeLabel(activeGlobalStart)}</p>
		              <p className="flex items-center gap-2"><Clock3 className="w-4 h-4" />Auto-stop in: {remainingRuntimeLabel(activeGlobalStart, activeGlobalMaxRuntime, !!activeGlobalStart)}</p>
		              <p className="text-xs text-slate-500">Last refreshed: {lastRefreshedAt || 'N/A'}</p>
		            </div>
		          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 shadow-lg shadow-slate-950/20">
        <h2 className="text-lg font-bold text-white mb-5">Source Controls</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sourceControls.map((source) => (
            <div key={source.source_key} className="border border-slate-700 bg-slate-800/50 rounded-xl p-4 hover:border-slate-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-slate-100 font-semibold">{source.source_name}</h3>
                <span className={`text-xs px-2 py-1 rounded border ${
                  !source.available
                    ? 'text-amber-200 border-amber-500/30 bg-amber-500/10'
                    : source.last_status === 'SUCCESS'
                    ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
                    : source.last_status === 'FAILURE' || source.last_status === 'NETWORK_ERROR' || source.last_status === 'TIMEOUT'
                    ? 'text-red-300 border-red-500/30 bg-red-500/10'
                    : 'text-slate-300 border-slate-600 bg-slate-700/40'
                }`}>
                  {source.last_status}
                </span>
              </div>
              <p className="text-[11px] text-cyan-300 mb-2">Source Key: {source.source_key}</p>
              <div className="text-xs text-slate-400 space-y-1 mb-4">
                <p>Last run collected: <span className="text-slate-200">{source.last_collected}</span></p>
                <p>Last run: <span className="text-slate-200">{source.last_run_time ? new Date(source.last_run_time).toLocaleString() : 'N/A'}</span></p>
                {!!source.last_error && (
                  <p className="text-red-300 break-words">
                    Last error: <span className="text-red-200">{source.last_error}</span>
                  </p>
                )}
              </div>
              <button
                onClick={() => runAction(source.source_key, () => apiClient.runSingleScraper(source.source_key))}
                disabled={!!actionLoading || !source.available}
                className={`w-full px-4 py-2 rounded-lg border border-blue-500/30 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 disabled:opacity-60 mb-2 transition-all ${
                  isPending(source.source_key) ? 'ring-2 ring-cyan-400/50 scale-[0.99]' : ''
                }`}
              >
                {isPending(source.source_key) ? 'Scraping...' : 'Scrape Once'}
	              </button>
	              <div className="grid grid-cols-2 gap-2">
	                <button
	                  onClick={() =>
	                    runAction(`start-${source.source_key}`, () =>
		                      apiClient.startSingleScraper(source.source_key, intervalSeconds, maxRuntimeSeconds)
	                    )
	                  }
	                  disabled={!!actionLoading || source.is_running || !source.available}
	                  className={`px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60 text-sm transition-all ${
	                    isPending(`start-${source.source_key}`) ? 'ring-2 ring-cyan-400/50 scale-[0.99]' : ''
	                  }`}
	                >
	                  {isPending(`start-${source.source_key}`) ? 'Starting...' : 'Start'}
	                </button>
	                <button
	                  onClick={() => runAction(`stop-${source.source_key}`, () => apiClient.stopSingleScraper(source.source_key))}
	                  disabled={!!actionLoading || !source.is_running || !source.available}
	                  className={`px-3 py-2 rounded-lg border border-red-500/30 bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60 text-sm transition-all ${
	                    isPending(`stop-${source.source_key}`) ? 'ring-2 ring-cyan-400/50 scale-[0.99]' : ''
	                  }`}
	                >
	                  {isPending(`stop-${source.source_key}`) ? 'Stopping...' : 'Stop'}
	                </button>
	                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Loop: {source.is_running ? 'running' : 'stopped'} (every {source.interval_seconds}s)
                </p>
                <p className="text-xs text-slate-500">
                  Loop start: {source.started_at ? new Date(source.started_at).toLocaleString() : 'N/A'}
                </p>
                <p className="text-xs text-slate-500">
                  Auto-stop in: {remainingRuntimeLabel(source.started_at, source.max_runtime_seconds, source.is_running)}
                </p>
                {!source.available && (
                  <p className="text-xs text-amber-300 mt-1">Source unavailable: backend scraper dependency missing.</p>
                )}
              </div>
            ))}
          </div>
        </div>

      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-xl font-bold text-white mb-2">Reset All Scraped Data?</h3>
            <p className="text-sm text-slate-300 mb-6">
              This will permanently delete all scraped records and linked analysis entries. The system will start fresh.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmResetData}
                className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30"
              >
                Yes, Reset
              </button>
            </div>
          </div>
        </div>
      )}
	    </div>
	  );
	}



