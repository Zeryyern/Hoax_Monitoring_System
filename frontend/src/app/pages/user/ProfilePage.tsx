import { useState, useEffect } from 'react';
import { User, Mail, Calendar, Lock, Loader, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { apiClient } from '@/services/apiClient';
import { Alert, AlertDescription } from '@/app/components/ui/alert';

interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  created_at: string;
  is_active: boolean;
}

interface AnalysisRecord {
  id: number;
  news_id: number;
  analysis_type: string;
  created_at: string;
  title?: string;
  prediction?: string;
  confidence?: number;
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch profile
      const profileResult = await apiClient.getUserProfile();
      if (profileResult.success && profileResult.data) {
        setProfile(profileResult.data as UserProfile);
      }

      // Fetch analysis history
      const analysisResult = await apiClient.getUserAnalysisHistory();
      if (analysisResult.success && analysisResult.data) {
        setAnalyses(analysisResult.data as AnalysisRecord[]);
      }
    } catch (err) {
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    setError(null);
    setSuccess(null);

    if (!passwordData.new_password) {
      setError('New password is required');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      setChangingPassword(true);
      const result = await apiClient.changePassword(passwordData.current_password, passwordData.new_password);

      if (result.success) {
        setSuccess('Password changed successfully');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
      } else {
        setError(result.error || 'Failed to change password');
      }
    } catch (err) {
      setError('Error changing password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-16 h-16 text-blue-400 animate-spin mx-auto mb-4" />
          <p className="text-slate-300 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 md:p-8">
      {/* Header */}
      <div className="mb-8 animate-slide-down">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">My Profile</h1>
        <p className="text-slate-400 text-lg">Manage your account information and security</p>
      </div>

      {/* Alerts */}
      {error && (
        <Alert className="mb-6 border-red-500/30 bg-red-500/10 animate-slide-down">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-6 border-green-500/30 bg-green-500/10 animate-slide-down">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <AlertDescription className="text-green-300">{success}</AlertDescription>
        </Alert>
      )}

      {profile && (
        <>
          {/* Profile Information Card */}
          <div className="group animate-slide-up mb-8" style={{ animationDelay: '0.1s' }}>
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 sm:p-8 hover:border-blue-500/50 transition-all duration-300">
                <h2 className="text-2xl font-bold text-white mb-6">Account Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Username */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-3">Username</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <User className="w-5 h-5 text-blue-400" />
                      <span className="text-white font-semibold">{profile.username}</span>
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-3">Email Address</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <Mail className="w-5 h-5 text-cyan-400" />
                      <span className="text-white font-semibold">{profile.email}</span>
                    </div>
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-3">Account Role</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                        profile.role === 'admin'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {profile.role.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Created Date */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-3">Member Since</label>
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg">
                      <Calendar className="w-5 h-5 text-green-400" />
                      <span className="text-white font-semibold">{new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="mt-8 pt-6 border-t border-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-slate-400 text-sm">Account Status</p>
                      <p className="text-white font-semibold mt-1">
                        {profile.is_active ? 'Active' : 'Inactive'}
                      </p>
                    </div>
                    <div className={`w-4 h-4 rounded-full ${profile.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Change Password Card */}
          <div className="group animate-slide-up mb-8" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 sm:p-8 hover:border-purple-500/50 transition-all duration-300">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Lock className="w-6 h-6 text-purple-400" />
                  Change Password
                </h2>

                <div className="space-y-4">
                  {/* Current Password */}
	                  <div>
	                    <label className="block text-sm font-semibold text-slate-400 mb-2">Current Password</label>
	                    <input
	                      type="password"
	                      autoComplete="off"
	                      value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      placeholder="Enter your current password"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  {/* New Password */}
	                  <div>
	                    <label className="block text-sm font-semibold text-slate-400 mb-2">New Password</label>
	                    <input
	                      type="password"
	                      autoComplete="new-password"
	                      value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      placeholder="Enter your new password (min 8 characters)"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  {/* Confirm Password */}
	                  <div>
	                    <label className="block text-sm font-semibold text-slate-400 mb-2">Confirm Password</label>
	                    <input
	                      type="password"
	                      autoComplete="new-password"
	                      value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      placeholder="Confirm your new password"
                      className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    onClick={handlePasswordChange}
                    disabled={changingPassword}
                    className="w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg border border-purple-400/30 hover:from-purple-500 hover:to-pink-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-purple-500/50"
                  >
                    {changingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Analysis History */}
          <div className="group animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div className="relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl blur opacity-20 group-hover:opacity-30 transition duration-300"></div>
              <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-xl p-5 sm:p-8 hover:border-green-500/50 transition-all duration-300">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-green-400" />
                  Analysis History
                </h2>

                {analyses.length > 0 ? (
                  <div className="space-y-3">
                    {analyses.slice(0, 10).map((analysis, idx) => (
                      <div
                        key={analysis.id}
                        className="border border-slate-700 bg-slate-800/30 hover:bg-slate-800/60 transition-all duration-300 p-4 rounded-lg hover:border-green-500/30 animate-slide-up"
                        style={{ animationDelay: `${0.4 + idx * 0.05}s` }}
                      >
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                          <div className="flex-1">
                            <p className="text-white font-semibold">{analysis.title || `Analysis #${analysis.id}`}</p>
                            <p className="text-xs text-slate-500 mt-1">{new Date(analysis.created_at).toLocaleString()}</p>
                          </div>
                          <div className="text-left sm:text-right flex-shrink-0">
                            <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                              analysis.prediction === 'Hoax'
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-green-500/20 text-green-300'
                            }`}>
                              {analysis.prediction || 'Pending'}
                            </span>
                            <p className="text-sm text-slate-400 mt-2">{((analysis.confidence || 0) * 100).toFixed(1)}%</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No analysis history yet</p>
                  </div>
                )}

                {analyses.length > 10 && (
                  <button className="w-full mt-6 px-6 py-3 border border-slate-600 bg-slate-800/50 hover:bg-slate-800 text-white font-semibold rounded-lg transition-all duration-300">
                    View All History ({analyses.length} total)
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}

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
    </div>
  );
}




