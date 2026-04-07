import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Brain, Loader, ScanSearch, Sparkles, Tags } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface StatsResponse {
  totals: {
    total_articles: number;
    hoax_count: number;
    legitimate_count: number;
    avg_confidence: number;
    hoax_percentage: number;
  };
  categories: Array<{ category: string; count: number; avg_confidence: number }>;
}

interface NewsItem {
  id: number;
  title: string;
  prediction: string;
  confidence: number;
}

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'have', 'will', 'yang', 'dan', 'dari', 'untuk', 'pada',
]);

export function NLPResultsPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const [statsRes, newsRes] = await Promise.all([
        apiClient.getRecentStatistics(30),
        apiClient.getNews(1, 200),
      ]);

      if (statsRes.success && statsRes.data) {
        setStats(statsRes.data as StatsResponse);
      } else {
        setError(statsRes.error || 'Failed to load NLP metrics');
      }

      if (newsRes.success && newsRes.data) {
        setNews(newsRes.data.items as NewsItem[]);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const topKeywords = useMemo(() => {
    const counter = new Map<string, number>();
    news
      .filter((n) => n.prediction === 'Hoax')
      .forEach((item) => {
        item.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, ' ')
          .split(/\s+/)
          .filter((token) => token.length > 3 && !STOPWORDS.has(token))
          .forEach((token) => counter.set(token, (counter.get(token) || 0) + 1));
      });
    return Array.from(counter.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([keyword, count]) => ({ keyword, count }));
  }, [news]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Processing NLP metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
          NLP Results
        </h1>
        <p className="text-slate-400 text-lg">Classifier outcomes and language pattern intelligence from backend data</p>
      </div>

      {error && (
        <Alert className="mb-6 border-red-500/30 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mb-8 items-stretch">
            <div className="h-full min-h-[130px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Total Analyzed</p>
                  <p className="text-3xl font-bold text-white mt-2">{stats.totals.total_articles}</p>
                </div>
                <ScanSearch className="w-7 h-7 text-cyan-400" />
              </div>
            </div>
            <div className="h-full min-h-[130px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Hoax Classified</p>
                  <p className="text-3xl font-bold text-red-400 mt-2">{stats.totals.hoax_count}</p>
                </div>
                <Brain className="w-7 h-7 text-red-400" />
              </div>
            </div>
            <div className="h-full min-h-[130px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Legitimate</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-2">{stats.totals.legitimate_count}</p>
                </div>
                <Sparkles className="w-7 h-7 text-emerald-400" />
              </div>
            </div>
            <div className="h-full min-h-[130px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm">Avg Confidence</p>
                  <p className="text-3xl font-bold text-white mt-2">{(stats.totals.avg_confidence * 100).toFixed(0)}%</p>
                </div>
                <Tags className="w-7 h-7 text-violet-400" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Category Confidence</h2>
              <div className="space-y-3">
                {stats.categories.map((category) => (
                  <div key={category.category} className="border border-slate-700 bg-slate-800/50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-200 font-medium">{category.category || 'General'}</span>
                      <span className="text-xs text-slate-400">{category.count} items</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                        style={{ width: `${Math.max(4, (category.avg_confidence || 0) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Avg NLP confidence: <span className="text-slate-300">{((category.avg_confidence || 0) * 100).toFixed(1)}%</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
              <h2 className="text-lg font-bold text-white mb-4">Top Hoax Keywords</h2>
              <div className="space-y-3">
                {topKeywords.length > 0 ? topKeywords.map((item, index) => (
                  <div key={item.keyword} className="flex items-center justify-between p-3 border border-slate-700 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30">
                        #{index + 1}
                      </span>
                      <span className="text-slate-200 font-medium">{item.keyword}</span>
                    </div>
                    <span className="text-slate-400 text-sm">{item.count}</span>
                  </div>
                )) : (
                  <p className="text-slate-400 text-sm">Not enough hoax data to generate keyword ranking.</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}



