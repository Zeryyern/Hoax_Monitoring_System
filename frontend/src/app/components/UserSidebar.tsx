import { useState } from 'react';
import { LayoutDashboard, Newspaper, BarChart3, User as UserIcon, LogOut, Menu, X } from 'lucide-react';

interface UserSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  userName?: string;
}

export function UserSidebar({ currentPage, onNavigate, onLogout, userName }: UserSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'news-monitoring', label: 'News Monitoring', icon: Newspaper },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'profile', label: 'My Profile', icon: UserIcon },
  ];

  return (
    <aside className="fixed top-0 left-0 right-0 z-50 w-full border-b border-slate-700 bg-slate-950 text-slate-100 md:static md:w-64 md:shrink-0 md:border-b-0 md:border-r md:h-screen md:sticky md:top-0 flex flex-col">
      {/* Logo Section */}
      <div className="p-4 md:p-6 border-b border-slate-700">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <span className="font-bold text-white">IH</span>
            </div>
            <span className="font-semibold text-white">User Portal</span>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-900"
            aria-label="Toggle user menu"
          >
            {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
        {userName && <p className="text-xs text-slate-400 mt-2">Logged in as: {userName}</p>}
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-b border-slate-700 p-3 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                  currentPage === item.id
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                    : 'border-transparent hover:bg-slate-900 text-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => {
              setMobileOpen(false);
              onLogout();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-600 bg-slate-900 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      )}

      {/* Desktop Navigation Menu */}
      <nav className="hidden md:block flex-1 p-4 overflow-y-auto">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full min-w-0 flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                  currentPage === item.id
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                    : 'border-transparent hover:bg-slate-900 text-slate-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Logout Button */}
      <div className="hidden md:block p-4 border-t border-slate-700">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-600 bg-slate-900 hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
}
