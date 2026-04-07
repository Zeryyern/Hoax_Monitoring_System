import { useState } from 'react';
import { Home, Info, Newspaper, LogIn, UserPlus, Menu, X, ShieldCheck } from 'lucide-react';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isLoggedIn?: boolean;
  isAdmin?: boolean;
  userName?: string;
  onLogout?: () => void;
}

export function Navigation({
  currentPage,
  onNavigate,
  isLoggedIn = false,
  isAdmin = false,
  userName,
  onLogout,
}: NavigationProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'about', label: 'About', icon: Info },
    { id: 'news', label: 'News', icon: Newspaper },
    ...(isLoggedIn
      ? []
      : [
          { id: 'signup', label: 'Sign Up', icon: UserPlus },
          { id: 'login', label: 'Login', icon: LogIn },
        ]),
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-700/70 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-700/30">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold leading-tight truncate">Hoax Monitoring System</p>
              <p className="text-[11px] text-slate-400 tracking-wide">News and Hoax Monitoring Platform</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all border ${
                    currentPage === item.id
                      ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                      : 'border-transparent text-slate-200 hover:bg-slate-800 hover:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}
            {isLoggedIn && onLogout && (
              <div className="flex items-center gap-3 ml-2 pl-3 border-l border-slate-700">
                <span className="text-sm text-slate-300 whitespace-nowrap">
                  {isAdmin ? `Admin: ${userName || 'User'}` : userName || 'User'}
                </span>
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>

          <button
            className="md:hidden p-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-800"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden mt-3 border border-slate-700 rounded-xl bg-slate-900/95 p-3 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border ${
                    currentPage === item.id
                      ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                      : 'border-transparent text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm">{item.label}</span>
                </button>
              );
            })}

            {isLoggedIn && onLogout && (
              <div className="pt-2 mt-2 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-2">
                  {isAdmin ? `Admin: ${userName || 'User'}` : userName || 'User'}
                </p>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileOpen(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-600 bg-slate-800 text-white hover:bg-slate-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
