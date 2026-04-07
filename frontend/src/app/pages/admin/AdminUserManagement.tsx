import { useState, useEffect } from 'react';
import { Users, Trash2, Shield, UserCheck, Loader, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'user';
  created_at: string;
  is_active: boolean;
  is_protected?: boolean;
}

export function AdminUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<'all' | 'admin' | 'user'>('all');
  const [confirmAction, setConfirmAction] = useState<
    | null
    | {
        type: 'delete' | 'role' | 'status';
        user: User;
        newRole?: 'admin' | 'user';
        newStatus?: boolean;
      }
  >(null);
  const [actionLoading, setActionLoading] = useState(false);
  const currentUserRaw = sessionStorage.getItem('current_user') || localStorage.getItem('current_user');
  let currentUser: { id?: number; username?: string } | null = null;
  try {
    currentUser = currentUserRaw ? JSON.parse(currentUserRaw) : null;
  } catch {
    currentUser = null;
  }
  const isSuperAdmin = users.some(
    (u) =>
      u.is_protected &&
      (
        (currentUser?.id != null && u.id === currentUser.id) ||
        ((currentUser?.username || '').toLowerCase() === (u.username || '').toLowerCase())
      )
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiClient.getAdminUsers(1, 100);
      if (result.success && result.data) {
        setUsers(result.data.items as User[]);
      } else {
        setError(result.error || 'Failed to load users');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: number, newRole: 'admin' | 'user') => {
    try {
      const result = await apiClient.changeUserRole(userId, newRole);
      if (result.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        setError(result.error || 'Failed to update user role');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating role');
    }
  };

  const handleDeleteUser = async (userId: number) => {
    try {
      const result = await apiClient.deleteUser(userId);
      if (result.success) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        setError(result.error || 'Failed to delete user');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting user');
    }
  };

  const handleStatusChange = async (userId: number, isActive: boolean) => {
    try {
      const result = await apiClient.changeUserStatus(userId, isActive);
      if (result.success) {
        setUsers(users.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u)));
      } else {
        setError(result.error || 'Failed to update user status');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating status');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const canManageRole = (user: User) => {
    if (user.is_protected) return false;
    if (isSuperAdmin) return true;
    return user.role !== 'admin';
  };

  const canDeleteUser = (user: User) => {
    if (user.is_protected) return false;
    if (isSuperAdmin) return true;
    return user.role !== 'admin';
  };

  const canChangeStatus = (user: User) => {
    if (currentUser?.id != null && user.id === currentUser.id) return false;
    if (user.is_protected) return false;
    if (isSuperAdmin) return true;
    return user.role !== 'admin';
  };

  const executeConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    setError(null);

    try {
      if (confirmAction.type === 'delete') {
        await handleDeleteUser(confirmAction.user.id);
      } else if (confirmAction.type === 'role' && confirmAction.newRole) {
        await handleRoleChange(confirmAction.user.id, confirmAction.newRole);
      } else if (confirmAction.type === 'status' && typeof confirmAction.newStatus === 'boolean') {
        await handleStatusChange(confirmAction.user.id, confirmAction.newStatus);
      }
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">User Management</h1>
        <p className="text-slate-400 text-lg">Manage user accounts, roles, and permissions</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="mb-6 border-red-500/30 bg-red-500/10 animate-slide-down">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search by username or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>

        {/* Role Filter */}
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value as any)}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
        >
          <option value="all">All Roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>

        {/* Refresh Button */}
        <button
          onClick={fetchUsers}
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-lg border border-blue-400/30 hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/50 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-8 items-stretch">
        {/* Total Users */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative h-full min-h-[130px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold text-white mt-2">{filteredUsers.length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/50">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Count */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative h-full min-h-[130px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-purple-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Admins</p>
                  <p className="text-3xl font-bold text-purple-400 mt-2">{filteredUsers.filter(u => u.role === 'admin').length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <Shield className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Regular Users */}
        <div className="group animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="relative">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
            <div className="relative h-full min-h-[130px] bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-green-500/50 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Regular Users</p>
                  <p className="text-3xl font-bold text-green-400 mt-2">{filteredUsers.filter(u => u.role === 'user').length}</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-green-500/50">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="group animate-slide-up mb-8" style={{ animationDelay: '0.4s' }}>
        <div className="relative">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-300"></div>
          <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-6 hover:border-blue-500/50 transition-all duration-300 overflow-x-auto">
            <h2 className="text-lg font-bold text-white mb-6">User Accounts</h2>
            
            {filteredUsers.length > 0 ? (
              <div className="space-y-2">
                {filteredUsers.map((user, idx) => (
                  <div
                    key={user.id}
                    className="border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 transition-all duration-300 p-4 rounded-lg group/user hover:border-blue-500/30 animate-slide-up"
                    style={{ animationDelay: `${0.5 + idx * 0.05}s` }}
                  >
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4 items-start md:items-center">
                      {/* Username */}
                      <div className="md:col-span-3">
                        <p className="text-white font-semibold group-hover/user:text-cyan-300 transition-colors">{user.username}</p>
                        <p className="text-xs text-slate-500 mt-1">{user.email}</p>
                      </div>

                      {/* Status */}
                      <div className="md:col-span-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                          <span className="text-sm text-slate-300">{user.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                        {!user.is_protected && (
                          <button
                            type="button"
                            onClick={() =>
                              setConfirmAction({
                                type: 'status',
                                user,
                                newStatus: !user.is_active,
                              })
                            }
                            disabled={!canChangeStatus(user)}
                            className={`mt-2 px-2.5 py-1 rounded-md text-xs border ${
                              user.is_active
                                ? 'border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
                                : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                          >
                            {user.is_active ? 'Set Inactive' : 'Set Active'}
                          </button>
                        )}
                      </div>

                      {/* Created Date */}
                      <div className="md:col-span-1">
                        <p className="text-sm text-slate-400">{new Date(user.created_at).toLocaleDateString()}</p>
                      </div>

                      {/* Role Badge */}
                      <div className="md:col-span-3">
                        <select
                          value={user.role}
                          onChange={(e) => {
                            const nextRole = e.target.value as 'admin' | 'user';
                            if (nextRole === user.role) return;
                            setConfirmAction({
                              type: 'role',
                              user,
                              newRole: nextRole,
                            });
                          }}
                          disabled={!canManageRole(user)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                            user.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          <option value="user">User</option>
                          {(isSuperAdmin || user.role === 'admin') && <option value="admin">Admin</option>}
                        </select>
                        {user.is_protected && (
                          <p className="text-[10px] text-amber-300 mt-1">Protected super admin</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="md:col-span-2 md:text-right">
                        <button
                          onClick={() => setConfirmAction({ type: 'delete', user })}
                          disabled={!canDeleteUser(user)}
                          className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-all transform hover:scale-110 opacity-100 md:opacity-0 md:group-hover/user:opacity-100 disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found matching your filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="text-center text-slate-500 text-sm animate-slide-up" style={{ animationDelay: '0.6s' }}>
        <p>Showing {filteredUsers.length} of {users.length} users</p>
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

      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6">
            <h3 className="text-xl font-bold text-white mb-2">
              {confirmAction.type === 'delete'
                ? 'Delete User?'
                : confirmAction.type === 'status'
                ? 'Change User Status?'
                : 'Change User Role?'}
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              {confirmAction.type === 'delete'
                ? `Do you want to delete "${confirmAction.user.username}" permanently?`
                : confirmAction.type === 'status'
                ? confirmAction.newStatus
                  ? `Activate "${confirmAction.user.username}"? This user can log in again.`
                  : `Deactivate "${confirmAction.user.username}"? They cannot log in or re-register with same account details.`
                : confirmAction.newRole === 'admin'
                ? `Grant admin privileges to "${confirmAction.user.username}"?`
                : `Change "${confirmAction.user.username}" to regular user?`}
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-60"
              >
                No
              </button>
              <button
                type="button"
                onClick={executeConfirmAction}
                disabled={actionLoading}
                className="px-4 py-2 rounded-lg border border-cyan-500/40 bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-60"
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




