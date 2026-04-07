import { Users, Check, X, Clock, Mail, Calendar, Search } from 'lucide-react';
import { useState } from 'react';

interface PendingUser {
  id: number;
  fullName: string;
  email: string;
  registrationDate: string;
  status: 'pending' | 'approved' | 'rejected';
}

export function UserManagementPage() {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([
    { id: 1, fullName: 'John Doe', email: 'john.doe@example.com', registrationDate: '2026-02-06', status: 'pending' },
    { id: 2, fullName: 'Jane Smith', email: 'jane.smith@example.com', registrationDate: '2026-02-06', status: 'pending' },
    { id: 3, fullName: 'Ahmad Ibrahim', email: 'ahmad.ibrahim@example.com', registrationDate: '2026-02-05', status: 'pending' },
    { id: 4, fullName: 'Sarah Williams', email: 'sarah.w@example.com', registrationDate: '2026-02-05', status: 'pending' },
    { id: 5, fullName: 'Michael Chen', email: 'michael.chen@example.com', registrationDate: '2026-02-04', status: 'pending' },
  ]);

  const [approvedUsers] = useState([
    { id: 6, fullName: 'Robert Johnson', email: 'robert.j@example.com', registrationDate: '2026-01-28', approvedDate: '2026-01-29' },
    { id: 7, fullName: 'Emily Davis', email: 'emily.davis@example.com', registrationDate: '2026-01-27', approvedDate: '2026-01-28' },
    { id: 8, fullName: 'David Martinez', email: 'david.m@example.com', registrationDate: '2026-01-25', approvedDate: '2026-01-26' },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');

  const handleApprove = (userId: number) => {
    setPendingUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: 'approved' } : user
    ));
    // In real app, this would make an API call
    alert(`User approved successfully!`);
  };

  const handleReject = (userId: number) => {
    setPendingUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: 'rejected' } : user
    ));
    // In real app, this would make an API call
    alert(`User registration rejected.`);
  };

  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <Users className="w-8 h-8 text-gray-700" />
          <h1 className="mb-0">User Management</h1>
        </div>
        <p className="text-gray-600">Manage user registrations and approve new accounts</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-12 gap-6 mb-8">
        <div className="col-span-4 border-2 border-gray-400 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 border-2 border-gray-600 bg-gray-200 flex items-center justify-center">
              <Clock className="w-6 h-6 text-gray-700" />
            </div>
          </div>
          <div className="mb-1">
            <div className="text-3xl font-bold text-gray-900">{pendingUsers.filter(u => u.status === 'pending').length}</div>
          </div>
          <div className="text-sm text-gray-600">Pending Approvals</div>
        </div>

        <div className="col-span-4 border-2 border-gray-400 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 border-2 border-gray-600 bg-gray-700 flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mb-1">
            <div className="text-3xl font-bold text-gray-900">{approvedUsers.length}</div>
          </div>
          <div className="text-sm text-gray-600">Approved Users</div>
        </div>

        <div className="col-span-4 border-2 border-gray-400 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 border-2 border-gray-600 bg-gray-200 flex items-center justify-center">
              <Users className="w-6 h-6 text-gray-700" />
            </div>
          </div>
          <div className="mb-1">
            <div className="text-3xl font-bold text-gray-900">{approvedUsers.length + pendingUsers.filter(u => u.status === 'approved').length}</div>
          </div>
          <div className="text-sm text-gray-600">Total Active Users</div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="border-2 border-gray-400 bg-white mb-8">
        <div className="p-6 border-b-2 border-gray-300">
          <div className="flex items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-3 border-2 transition-colors ${
                  activeTab === 'pending'
                    ? 'border-gray-800 bg-gray-700 text-white'
                    : 'border-gray-400 bg-white hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">Pending Registrations</span>
              </button>
              <button
                onClick={() => setActiveTab('approved')}
                className={`px-6 py-3 border-2 transition-colors ${
                  activeTab === 'approved'
                    ? 'border-gray-800 bg-gray-700 text-white'
                    : 'border-gray-400 bg-white hover:bg-gray-100'
                }`}
              >
                <span className="font-medium">Approved Users</span>
              </button>
            </div>

            {/* Search */}
            <div className="relative w-80">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border-2 border-gray-400 px-4 py-3 pr-10 bg-white focus:border-gray-600 focus:outline-none"
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            </div>
          </div>
        </div>

        {/* Pending Registrations Tab */}
        {activeTab === 'pending' && (
          <div className="p-6">
            {pendingUsers.filter(u => u.status === 'pending').length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p>No pending registrations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingUsers
                  .filter(u => u.status === 'pending')
                  .map((user) => (
                    <div
                      key={user.id}
                      className="border-2 border-gray-300 p-5 bg-gray-50"
                    >
                      <div className="grid grid-cols-12 gap-4 items-center">
                        {/* User Info */}
                        <div className="col-span-5">
                          <h3 className="mb-2">{user.fullName}</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                        </div>

                        {/* Registration Date */}
                        <div className="col-span-3">
                          <div className="text-sm text-gray-600 mb-1">Registration Date</div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span className="font-medium">{user.registrationDate}</span>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="col-span-2">
                          <div className="flex items-center gap-2 px-3 py-2 border-2 border-gray-600 bg-gray-100">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium uppercase">Pending</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="col-span-2 flex gap-2 justify-end">
                          <button
                            onClick={() => handleApprove(user.id)}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-gray-700 bg-gray-700 text-white hover:bg-gray-800 transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                            <span className="text-sm">Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(user.id)}
                            className="flex items-center gap-2 px-4 py-2 border-2 border-gray-600 bg-white hover:bg-gray-100 transition-colors"
                            title="Reject"
                          >
                            <X className="w-4 h-4" />
                            <span className="text-sm">Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}

        {/* Approved Users Tab */}
        {activeTab === 'approved' && (
          <div className="p-6">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 text-sm font-medium text-gray-700">Full Name</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-700">Registration Date</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-700">Approved Date</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {approvedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="py-4 font-medium">{user.fullName}</td>
                    <td className="py-4 text-gray-600">{user.email}</td>
                    <td className="py-4 text-gray-600">{user.registrationDate}</td>
                    <td className="py-4 text-gray-600">{user.approvedDate}</td>
                    <td className="py-4">
                      <span className="text-xs px-3 py-1 border-2 border-gray-700 bg-gray-700 text-white">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Notice */}
      <div className="border-2 border-gray-400 bg-gray-100 p-4 text-sm text-gray-700">
        <p>
          <strong>Admin Approval Required:</strong> All new user registrations require manual approval by an administrator before they can access the system. This ensures security and prevents unauthorized access.
        </p>
      </div>
    </div>
  );
}

