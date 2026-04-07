import { FormEvent, useState } from 'react';
import { BarChart3, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface FormState {
  title: string;
  source: string;
  article: string;
  source_url: string;
  category: string;
  published_date: string;
  confidence: string;
}

const INITIAL_FORM: FormState = {
  title: '',
  source: '',
  article: '',
  source_url: '',
  category: 'Admin Analytics',
  published_date: '',
  confidence: '1',
};

export function AdminHoaxAnalyticsPage() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setLoading(true);

    try {
      const confidence = Number(form.confidence);
      const result = await apiClient.addHoaxAnalyticsEntry({
        title: form.title.trim(),
        source: form.source.trim(),
        article: form.article.trim() || undefined,
        source_url: form.source_url.trim() || undefined,
        category: form.category.trim() || undefined,
        published_date: form.published_date || undefined,
        confidence: Number.isFinite(confidence) ? confidence : 1,
      });

      if (result.success) {
        setSuccess('Hoax analytics entry added successfully.');
        setForm(INITIAL_FORM);
      } else {
        setError(result.error || 'Failed to add hoax analytics entry.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add hoax analytics entry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-transparent bg-gradient-to-r from-cyan-300 to-blue-400 bg-clip-text mb-2">
            Hoax Analytics Input
          </h1>
          <p className="text-slate-400 text-lg">Add manual hoax records with source and published date.</p>
        </div>

        <div className="border border-slate-700 bg-slate-900/80 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Hoax title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                required
              />
              <input
                type="text"
                placeholder="Source (example: Detik Hoax or Not)"
                value={form.source}
                onChange={(e) => setForm((prev) => ({ ...prev, source: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                required
              />
            </div>

            <textarea
              placeholder="Article content or notes (optional)"
              value={form.article}
              onChange={(e) => setForm((prev) => ({ ...prev, article: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 min-h-[140px]"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="url"
                placeholder="Source URL (optional)"
                value={form.source_url}
                onChange={(e) => setForm((prev) => ({ ...prev, source_url: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <input
                type="date"
                value={form.published_date}
                onChange={(e) => setForm((prev) => ({ ...prev, published_date: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.01"
                value={form.confidence}
                onChange={(e) => setForm((prev) => ({ ...prev, confidence: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <input
              type="text"
              placeholder="Category (default: Admin Analytics)"
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
            />

            {success && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-300 text-sm">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-red-300 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-cyan-500/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-60"
            >
              <BarChart3 className="w-4 h-4" />
              {loading ? 'Saving...' : 'Add Hoax Analytics'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
