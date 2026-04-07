import { Lock, Mail, ShieldCheck, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { apiClient } from '@/services/apiClient';

interface UserLoginPageProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onNavigateToSignup: () => void;
  onNavigateToAdminLogin: () => void;
  onNavigateToForgotPassword: () => void;
}

export function UserLoginPage({ onLogin, onNavigateToSignup, onNavigateToAdminLogin, onNavigateToForgotPassword }: UserLoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendReady, setBackendReady] = useState<boolean | null>(null);

  useEffect(() => {
    apiClient.getHealthStatus().then((result) => setBackendReady(result.success));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await onLogin(email, password);
    if (!result.success) {
      setError(result.error || 'Login failed');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-24 -left-10 w-72 h-72 bg-cyan-500/20 blur-3xl rounded-full" />
      <div className="absolute bottom-10 -right-10 w-72 h-72 bg-blue-500/20 blur-3xl rounded-full" />

      <div className="w-full max-w-md relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl blur opacity-20" />
        <div className="relative bg-slate-900/90 border border-slate-700 rounded-2xl p-8 md:p-10">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">User Login</h2>
            <p className="text-slate-400 text-sm">Secure access to monitoring and analysis</p>
          </div>

          {backendReady === false && (
            <div className="mb-4 border border-amber-500/30 bg-amber-500/10 rounded-lg p-3 text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <span>Backend API is not reachable. Start backend with: `python main.py` inside `Hoax_Monitoring`.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="off"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 pl-11 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  required
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  autoComplete="off"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 pl-11 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {error && (
            <div className="mt-4 border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-3 text-center text-sm">
            <p className="text-slate-500">
              Forgot your password?{' '}
              <button onClick={onNavigateToForgotPassword} className="text-cyan-300 hover:text-cyan-200 underline">
                Contact administrator
              </button>
            </p>
            <p className="text-slate-400">
              New here?{' '}
              <button onClick={onNavigateToSignup} className="text-cyan-300 hover:text-cyan-200 underline">
                Create account
              </button>
            </p>
            <p className="text-slate-500">
              Admin access?{' '}
              <button onClick={onNavigateToAdminLogin} className="text-blue-300 hover:text-blue-200 underline">
                Use admin login
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

