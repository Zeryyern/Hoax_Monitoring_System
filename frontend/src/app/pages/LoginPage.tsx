import { Lock, User, AlertCircle, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/apiClient";

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onNavigateToUserLogin: () => void;
  onNavigateToForgotPassword: () => void;
}

export function LoginPage({ onLogin, onNavigateToUserLogin, onNavigateToForgotPassword }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute top-20 left-10 w-64 h-64 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

      {/* Main Container */}
      <div className="w-full max-w-md z-10 animate-slide-up">
        {/* Glass Morphism Card */}
        <div className="relative">
          {/* Glow Effect */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl blur-xl opacity-20"></div>

          {/* Card */}
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 md:p-10">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mx-auto mb-4 rounded-xl shadow-lg shadow-blue-500/50 transform hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h2 className="mb-2 text-2xl md:text-3xl font-bold text-white">Admin Login</h2>
              <p className="text-slate-400 text-sm">
                Enter your credentials to access the dashboard
              </p>
            </div>

            {/* Admin Notice */}
            <div className="bg-blue-500/10 border border-blue-500/30 p-4 mb-6 rounded-lg flex items-start gap-3 animate-fade-in">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-300">
                <strong>Secure Admin Access</strong> - This area is restricted to authorized administrators only.
              </p>
            </div>

            {backendReady === false && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 mb-4 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Backend API is not reachable. Start backend with: `python main.py` inside `Hoax_Monitoring`.</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
              {/* Username/Email Input */}
              <div className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
                <label
                  htmlFor="email"
                  className="block text-sm font-semibold text-slate-300 mb-2"
                >
                  Email Address
                </label>
                <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'ring-2 ring-blue-500/50' : ''}`}>
                  <input
                    id="email"
                    type="text"
                    autoComplete="off"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full border border-slate-600 px-4 py-3 pl-12 bg-slate-800/50 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-blue-500 focus:outline-none rounded-lg transition-all duration-300"
                  />
                  <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                </div>
              </div>

              {/* Password Input */}
              <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-slate-300 mb-2"
                >
                  Password
                </label>
                <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'ring-2 ring-blue-500/50' : ''}`}>
                  <input
                    id="password"
                    type="password"
                    autoComplete="off"
                    placeholder="********"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="w-full border border-slate-600 px-4 py-3 pl-12 bg-slate-800/50 text-white placeholder-slate-500 focus:bg-slate-800 focus:border-blue-500 focus:outline-none rounded-lg transition-all duration-300"
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold py-3 rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 mt-6 animate-slide-up"
                style={{ animationDelay: '0.3s' }}
              >
                {isSubmitting ? 'Signing in...' : 'Sign In to Dashboard'}
              </button>
            </form>

            {error && (
              <div className="mt-4 bg-red-500/10 border border-red-500/30 p-3 rounded-lg text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Divider */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              {/* Footer Links */}
              <div className="space-y-4">
                <div className="text-center text-sm text-slate-400">
                  <p>
                    Forgot your password?{" "}
                    <button
                      type="button"
                      onClick={onNavigateToForgotPassword}
                      className="text-blue-400 font-medium hover:text-blue-300 transition-colors underline"
                    >
                      Contact Administrator
                    </button>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-2">Don't have admin access?</p>
                  <button
                    onClick={onNavigateToUserLogin}
                    className="w-full px-4 py-2 text-sm font-semibold text-blue-400 border border-blue-500/30 bg-blue-500/10 rounded-lg hover:bg-blue-500/20 transition-all duration-300 hover:border-blue-500/50"
                  >
                    Switch to User Login
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}


