import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader, Mail, RefreshCw, Shield, Ticket, Trash2, User } from 'lucide-react';
import { apiClient } from '@/services/apiClient';

interface TicketItem {
  id: number;
  full_name: string;
  email: string;
  message: string | null;
  ticket_type: 'user' | 'admin';
  admin_unique_id: string | null;
  matched_user_id: number | null;
  matched_username: string | null;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at: string | null;
  resolved_by_username: string | null;
  resolution_note: string | null;
}

export function PasswordResetTicketsPage() {
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [adminUniqueIdInput, setAdminUniqueIdInput] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState<Record<number, string>>({});
  const [deleteReasons, setDeleteReasons] = useState<Record<number, string>>({});
  const [resetCredentials, setResetCredentials] = useState<Record<number, { username: string; password: string }>>({});

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getPasswordResetTickets(1, 100, statusFilter);
      if (result.success && result.data) {
        setTickets(result.data.items as TicketItem[]);
      } else {
        setError(result.error || 'Failed to load tickets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const resolveTicket = async (ticket: TicketItem) => {
    const ticketId = ticket.id;
    try {
      setActionLoading(ticketId);
      setError(null);
      setSuccess(null);
      if (!adminUniqueIdInput.trim()) {
        setError('Admin unique ID confirmation is required.');
        return;
      }
      const creds = resetCredentials[ticketId] || { username: '', password: '' };
      const wantsReset = !!creds.username.trim() || !!creds.password.trim();

      const result = await apiClient.resolvePasswordResetTicket(
        ticketId,
        adminUniqueIdInput.trim(),
        resolutionNotes[ticketId] || '',
        wantsReset ? creds.username.trim() : undefined,
        wantsReset ? creds.password : undefined
      );
      if (result.success) {
        const notifText = (result.data as any)?.notification_sent ? ' Email notification sent.' : ' Email notification was not sent.';
        setSuccess(`Ticket #${ticketId} marked as resolved.${notifText}`);
        await fetchTickets();
      } else {
        setError(result.error || 'Failed to resolve ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve ticket');
    } finally {
      setActionLoading(null);
    }
  };

  const deleteTicket = async (ticket: TicketItem) => {
    try {
      setActionLoading(ticket.id);
      setError(null);
      setSuccess(null);
      if (!adminUniqueIdInput.trim()) {
        setError('Admin unique ID confirmation is required.');
        return;
      }
      const result = await apiClient.deletePasswordResetTicket(
        ticket.id,
        adminUniqueIdInput.trim(),
        deleteReasons[ticket.id] || ''
      );
      if (result.success) {
        setSuccess(`Ticket #${ticket.id} deleted successfully.`);
        await fetchTickets();
      } else {
        setError(result.error || 'Failed to delete ticket');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete ticket');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading password reset tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          Password Reset Tickets
        </h1>
        <p className="text-slate-400">Review and resolve account recovery requests.</p>
      </div>

      {error && (
        <div className="mb-6 border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-sm text-red-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-6 border border-emerald-500/30 bg-emerald-500/10 rounded-lg p-3 text-sm text-emerald-300 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'open' | 'resolved')}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
        >
          <option value="all">All Tickets</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          onClick={fetchTickets}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
        <input
          type="text"
          value={adminUniqueIdInput}
          onChange={(e) => setAdminUniqueIdInput(e.target.value)}
          placeholder="Confirm with your admin ID (e.g. ADM-1)"
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      <div className="space-y-3">
        {tickets.length === 0 && (
          <div className="text-center py-12 border border-slate-700 rounded-xl bg-slate-900/40 text-slate-400">
            <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No tickets found.</p>
          </div>
        )}

        {tickets.map((ticket) => (
          <div key={ticket.id} className="border border-slate-700 bg-slate-900/40 rounded-xl p-4">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-200">
                  <Ticket className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold">Ticket #{ticket.id}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-700/70 text-slate-200">
                    {ticket.ticket_type.toUpperCase()}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ticket.status === 'open' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                    {ticket.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <User className="w-4 h-4 text-slate-500" />
                  {ticket.full_name}
                </div>
                <div className="flex items-center gap-2 text-slate-300 text-sm">
                  <Mail className="w-4 h-4 text-slate-500" />
                  {ticket.email}
                </div>
                <p className="text-xs text-slate-500">Submitted: {new Date(ticket.created_at).toLocaleString()}</p>
                {ticket.ticket_type === 'admin' && (
                  <p className="text-xs text-purple-300">Submitted admin unique ID: {ticket.admin_unique_id || '-'}</p>
                )}
                {ticket.matched_user_id ? (
                  <p className="text-xs text-cyan-300">Matched account: {ticket.matched_username} (ID {ticket.matched_user_id})</p>
                ) : (
                  <p className="text-xs text-amber-300">No matched account found for this email</p>
                )}
                {ticket.message && <p className="text-sm text-slate-300 mt-2">{ticket.message}</p>}
                {ticket.status === 'resolved' && (
                  <div className="text-xs text-emerald-300 mt-2">
                    Resolved by {ticket.resolved_by_username || 'Admin'} at {ticket.resolved_at ? new Date(ticket.resolved_at).toLocaleString() : '-'}
                    {ticket.resolution_note ? ` - ${ticket.resolution_note}` : ''}
                  </div>
                )}
              </div>

              {ticket.status === 'open' && (
                <div className="w-full xl:w-[340px] space-y-2">
                  {ticket.matched_user_id && (
                    <>
                      <input
                        type="text"
                        value={resetCredentials[ticket.id]?.username || ''}
                        onChange={(e) =>
                          setResetCredentials((prev) => ({
                            ...prev,
                            [ticket.id]: { username: e.target.value, password: prev[ticket.id]?.password || '' },
                          }))
                        }
                        placeholder="Default username (optional reset)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                      />
                      <input
                        type="password"
                        value={resetCredentials[ticket.id]?.password || ''}
                        onChange={(e) =>
                          setResetCredentials((prev) => ({
                            ...prev,
                            [ticket.id]: { username: prev[ticket.id]?.username || '', password: e.target.value },
                          }))
                        }
                        placeholder="Default password (optional reset)"
                        className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                      />
                    </>
                  )}
                  <input
                    type="text"
                    value={resolutionNotes[ticket.id] || ''}
                    onChange={(e) => setResolutionNotes((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                    placeholder="Resolution note (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                  />
                  <input
                    type="text"
                    value={deleteReasons[ticket.id] || ''}
                    onChange={(e) => setDeleteReasons((prev) => ({ ...prev, [ticket.id]: e.target.value }))}
                    placeholder="Delete reason (optional)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500"
                  />
                  <div className="flex items-center gap-2">
                  <button
                    onClick={() => resolveTicket(ticket)}
                    disabled={actionLoading === ticket.id}
                    className="px-4 py-2 rounded-lg border border-emerald-500/40 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-60 flex items-center gap-2"
                  >
                    <Shield className="w-4 h-4" />
                    {actionLoading === ticket.id ? 'Resolving...' : 'Resolve Ticket'}
                  </button>
                    <button
                      onClick={() => deleteTicket(ticket)}
                      disabled={actionLoading === ticket.id}
                      className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/20 text-red-200 hover:bg-red-500/30 disabled:opacity-60 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      {actionLoading === ticket.id ? 'Deleting...' : 'Delete Ticket'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
