import { useState } from 'react';
import { AlertCircle, CheckCircle2, LifeBuoy, Mail, User } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface ForgotPasswordPageProps {
  mode: 'user' | 'admin';
  onBack: () => void;
}

export function ForgotPasswordPage({ mode, onBack }: ForgotPasswordPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [adminUniqueId, setAdminUniqueId] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    const result = await apiClient.createPasswordResetTicket(
      fullName,
      email,
      message,
      mode,
      mode === 'admin' ? adminUniqueId : undefined
    );
    if (result.success) {
      setSuccess('Ticket submitted successfully. An administrator will review your request.');
      setFullName('');
      setEmail('');
      setAdminUniqueId('');
      setMessage('');
    } else {
      setError(result.error || 'Failed to submit ticket');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20" />
          <div className="relative bg-slate-900/90 border border-slate-700 rounded-2xl p-8">
            <div className="text-center mb-8">
              <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500">
                <LifeBuoy className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2">
                {mode === 'admin' ? 'Admin Password Recovery' : 'Forgot Password'}
              </h2>
              <p className="text-slate-400 text-sm">
                Submit a support ticket. Only administrators can view and process requests.
              </p>
            </div>

            {success && (
              <div className="mb-4 border border-emerald-500/30 bg-emerald-500/10 rounded-lg p-3 text-sm text-emerald-300 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="mb-4 border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-sm text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                <div className="relative">
                  <input
                    id="full_name"
                    type="text"
                    autoComplete="off"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 pl-11 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    required
                  />
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    autoComplete="off"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 pl-11 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    required
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                </div>
              </div>

              {mode === 'admin' && (
                <div>
                  <label htmlFor="admin_unique_id" className="block text-sm font-medium text-slate-300 mb-2">Admin Unique ID</label>
                  <input
                    id="admin_unique_id"
                    type="text"
                    autoComplete="off"
                    value={adminUniqueId}
                    onChange={(e) => setAdminUniqueId(e.target.value)}
                    placeholder="Use your admin unique ID (e.g. ADM-7)"
                    className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-slate-300 mb-2">Additional Note (Optional)</label>
                <textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Include relevant context if needed."
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button onClick={onBack} className="text-sm text-cyan-300 hover:text-cyan-200 underline">
                Back
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
