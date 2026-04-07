import { CheckCircle2, Eye, EyeOff, Lock, Mail, User, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface SignupPageProps {
  onSignup: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onNavigateToLogin?: () => void;
}

export function SignupPage({ onSignup, onNavigateToLogin }: SignupPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const username = fullName.trim().replace(/\s+/g, '_').toLowerCase();
    setIsSubmitting(true);
    const result = await onSignup(username, email, password);

    if (result.success) {
      setIsSubmitted(true);
    } else {
      setError(result.error || 'Registration failed');
    }

    setIsSubmitting(false);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-25" />
            <div className="relative bg-slate-900/90 border border-slate-700 rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-cyan-500">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Registration Successful</h2>
              <p className="text-slate-300 mb-6">
                Your account has been created. You can now sign in and start monitoring content.
              </p>
              <button
                onClick={onNavigateToLogin}
                className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-semibold hover:from-cyan-500 hover:to-blue-500"
              >
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute top-16 -left-16 w-80 h-80 bg-cyan-500/20 blur-3xl rounded-full" />
      <div className="absolute bottom-0 -right-12 w-80 h-80 bg-emerald-500/20 blur-3xl rounded-full" />

      <div className="w-full max-w-lg relative">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-2xl blur opacity-20" />
        <div className="relative bg-slate-900/90 border border-slate-700 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-cyan-500 to-emerald-500">
              <UserPlus className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Create Account</h2>
            <p className="text-slate-400 text-sm">Join the hoax monitoring platform</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative">
                <input
                  id="fullName"
                  type="text"
                  autoComplete="off"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Jane Doe"
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

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 pl-11 pr-11 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 pl-11 pr-11 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                  required
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-semibold hover:from-cyan-500 hover:to-emerald-500 disabled:opacity-60"
            >
              {isSubmitting ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          {error && (
            <div className="mt-4 border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <button onClick={onNavigateToLogin} className="text-cyan-300 hover:text-cyan-200 underline">
              Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

