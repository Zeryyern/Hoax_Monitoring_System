import { useState, useEffect } from 'react';
import { Loader, AlertCircle, Clock, User, FileText, Search, RefreshCw, Trash2 } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface AdminLog {
  id: number;
  admin_id: number;
  admin_username: string;
  action: string;
  details: string | null;
  created_at: string;
}

export function AdminLogsPage() {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [todayTotal, setTodayTotal] = useState(0);
  const [uniqueAdminsTotal, setUniqueAdminsTotal] = useState(0);
  const [canReset, setCanReset] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);
  const [showResetPrompt, setShowResetPrompt] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [currentPage]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getAdminLogs(currentPage, 50);
      if (result.success && result.data) {
        setLogs(result.data.logs as AdminLog[]);
        setTotalLogs(Number(result.data.total || 0));
        setTodayTotal(Number(result.data.today_total || 0));
        setUniqueAdminsTotal(Number(result.data.unique_admins_total || 0));
        setCanReset(Boolean(result.data.can_reset));
      } else {
        setError(result.error || 'Failed to load logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logs');
    } finally {
      setLoading(false);
    }
  };

  const handleResetLogs = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      const result = await apiClient.resetAdminLogs();
      if (result.success && result.data) {
        setSuccess(`Activity logs reset successfully. Removed ${result.data.removed} entries.`);
        setCurrentPage(1);
        await fetchLogs();
      } else {
        setError(result.error || 'Failed to reset activity logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset activity logs');
    } finally {
      setActionLoading(false);
      setShowResetPrompt(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.toLowerCase().includes('delete')) return 'text-red-400 bg-red-500/10';
    if (action.toLowerCase().includes('create')) return 'text-green-400 bg-green-500/10';
    if (action.toLowerCase().includes('update')) return 'text-blue-400 bg-blue-500/10';
    if (action.toLowerCase().includes('role')) return 'text-purple-400 bg-purple-500/10';
    return 'text-slate-400 bg-slate-500/10';
  };

  const filteredLogs = logs.filter(log =>
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.admin_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (log.details || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading admin logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">Admin Activity Logs</h1>
        <p className="text-slate-400 text-lg">Track all administrative actions and system changes</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-500/30 bg-red-500/10 animate-slide-down">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-emerald-500/30 bg-emerald-500/10 animate-slide-down">
          <AlertCircle className="h-4 w-4 text-emerald-400" />
          <AlertDescription className="text-emerald-300">{success}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search logs by action, admin, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchLogs}
          disabled={actionLoading}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>

        <button
          onClick={() => setShowResetPrompt(true)}
          disabled={actionLoading || !canReset}
          className="px-6 py-2.5 bg-red-500/20 text-red-300 font-semibold rounded-lg border border-red-500/40 hover:bg-red-500/30 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          title={canReset ? 'Reset all activity logs' : 'Only super admin can reset logs'}
        >
          <Trash2 className="w-4 h-4" />
          Reset Activities
        </button>
      </div>

      {/* Info Card */}
      <div className="mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-10"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 items-stretch">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Total Logs</p>
                  <p className="text-2xl font-bold text-white">{totalLogs}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                  <User className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Unique Admins</p>
                  <p className="text-2xl font-bold text-white">{uniqueAdminsTotal}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-slate-400 text-sm">Today's Actions</p>
                  <p className="text-2xl font-bold text-white">
                    {todayTotal}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="group animate-slide-up mb-8" style={{ animationDelay: '0.2s' }}>
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300">
            <h2 className="text-lg font-bold text-white mb-6">Activity Timeline</h2>

            {filteredLogs.length > 0 ? (
              <div className="space-y-3">
                {filteredLogs.map((log, idx) => (
                  <div
                    key={log.id}
                    className="border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 transition-all duration-300 p-4 rounded-lg group/log hover:border-blue-500/30 animate-slide-up"
                    style={{ animationDelay: `${0.3 + idx * 0.05}s` }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start">
                      {/* Timestamp */}
                      <div className="md:col-span-2">
                        <p className="text-xs text-slate-500 font-semibold">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>

                      {/* Admin */}
                      <div className="md:col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="text-sm font-semibold text-slate-300">{log.admin_username || 'System'}</span>
                        </div>
                      </div>

                      {/* Action */}
                      <div className="md:col-span-3">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold border border-current/30 ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="md:col-span-5">
                        <p className="text-sm text-slate-400 line-clamp-2 group-hover/log:text-slate-300 transition-colors">
                          {log.details || 'No additional details'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No logs found matching your search</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-3 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <button
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="px-6 py-2.5 bg-slate-800 border border-slate-700 text-white font-semibold rounded-lg hover:border-blue-500/50 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <span className="text-slate-400 font-medium">Page {currentPage}</span>
        <button
          onClick={() => setCurrentPage(prev => prev + 1)}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105"
        >
          Next
        </button>
      </div>

      {/* CSS for animations */}
      <style>{`
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

        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-up {
          animation: slide-up 0.6s ease-out forwards;
          opacity: 0;
        }

        .animate-slide-down {
          animation: slide-down 0.6s ease-out;
        }
      `}</style>

      {showResetPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-xl font-bold text-white mb-2">Reset Activity Logs?</h3>
            <p className="text-sm text-slate-300 mb-6">
              Do you truly want to clear all admin activity logs? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResetPrompt(false)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-60"
              >
                No
              </button>
              <button
                type="button"
                onClick={handleResetLogs}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60"
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



