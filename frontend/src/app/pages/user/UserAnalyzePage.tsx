import { useState } from 'react';
import { Loader2, Sparkles, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface AnalysisResult {
  id?: number;
  title?: string;
  source?: string;
  category?: string;
  date?: string;
  prediction?: 'Hoax' | 'Legitimate';
  confidence?: number;
  content?: string;
}

const CATEGORY_OPTIONS = [
  'General',
  'Politics',
  'Health',
  'Economy',
  'Technology',
  'Disaster',
  'Sports',
  'Entertainment',
];

export function UserAnalyzePage() {
  const [text, setText] = useState('');
  const [source, setSource] = useState('User Input');
  const [category, setCategory] = useState('General');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const runAnalysis = async () => {
    setError(null);
    setResult(null);

    if (text.trim().length < 20) {
      setError('Please enter at least 20 characters to analyze.');
      return;
    }

    try {
      setLoading(true);
      const response = await apiClient.analyzeText(text.trim(), source.trim() || 'User Input', category);
      if (response.success && response.data) {
        setResult(response.data as AnalysisResult);
      } else {
        setError(response.error || 'Analysis failed.');
      }
    } catch {
      setError('Unable to analyze text right now.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text mb-2">
            Analyze Article
          </h1>
          <p className="text-slate-300 font-semibold">Run hoax detection on your own text input.</p>
        </div>

        <div className="rounded-xl border border-slate-700 bg-slate-900/80 p-5 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-slate-300 font-bold mb-2">Source Label</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                placeholder="User Input"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 font-bold mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="block text-sm text-slate-300 font-bold mb-2">Article Text</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-slate-100 focus:outline-none focus:border-cyan-400"
            placeholder="Paste article content here..."
          />
          <p className="mt-2 text-xs text-slate-400">{text.length} characters</p>

          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="mt-5 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold border border-cyan-400/30 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Analyze Now
          </button>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-red-300 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/80 p-6">
            <h2 className="text-2xl font-extrabold text-white mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              Analysis Result
            </h2>

            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className={`px-3 py-1 rounded-md text-sm font-bold ${
                result.prediction === 'Hoax' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                {result.prediction || 'Unknown'}
              </span>
              <span className="px-3 py-1 rounded-md text-sm font-bold bg-slate-800 text-slate-200 border border-slate-700">
                Confidence: {Math.round((result.confidence || 0) * 100)}%
              </span>
              <span className="px-3 py-1 rounded-md text-sm font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Category: {result.category || category}
              </span>
            </div>

            <p className="text-slate-300 leading-relaxed font-medium whitespace-pre-line">
              {result.content || text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}



