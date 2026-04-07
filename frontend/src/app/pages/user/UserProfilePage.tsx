import { User, Mail, Calendar, Shield } from 'lucide-react';

export function UserProfilePage() {
  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="mb-2">My Profile</h1>
        <p className="text-gray-600">View and manage your account information</p>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Profile Information */}
        <div className="col-span-8 border-2 border-gray-400 bg-white">
          <div className="p-6 border-b-2 border-gray-300">
            <h2>Account Information</h2>
          </div>
          <div className="p-8">
            {/* Profile Picture */}
            <div className="flex items-start gap-6 mb-8 pb-8 border-b border-gray-300">
              <div className="w-24 h-24 border-2 border-gray-600 bg-gray-200 flex items-center justify-center">
                <User className="w-12 h-12 text-gray-600" />
              </div>
              <div className="flex-1">
                <h3 className="mb-2">Profile Picture</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Update your profile picture to personalize your account
                </p>
                <button className="px-6 py-2 border-2 border-gray-600 bg-white hover:bg-gray-100 text-sm">
                  Change Picture
                </button>
              </div>
            </div>

            {/* Personal Details */}
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="John Doe"
                      readOnly
                      className="w-full border-2 border-gray-400 px-4 py-3 pl-12 bg-gray-50 text-gray-600"
                    />
                    <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      value="john.doe@example.com"
                      readOnly
                      className="w-full border-2 border-gray-400 px-4 py-3 pl-12 bg-gray-50 text-gray-600"
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Member Since
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="January 15, 2026"
                      readOnly
                      className="w-full border-2 border-gray-400 px-4 py-3 pl-12 bg-gray-50 text-gray-600"
                    />
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Type
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value="Standard User"
                      readOnly
                      className="w-full border-2 border-gray-400 px-4 py-3 pl-12 bg-gray-50 text-gray-600"
                    />
                    <Shield className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-300">
                <button className="px-6 py-3 border-2 border-gray-600 bg-white hover:bg-gray-100">
                  Edit Profile Information
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="col-span-4 space-y-6">
          {/* Account Status */}
          <div className="border-2 border-gray-400 bg-white">
            <div className="p-6 border-b-2 border-gray-300">
              <h2>Account Status</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-gray-300">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className="px-3 py-1 border-2 border-gray-700 bg-gray-700 text-white text-xs font-medium">
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-300">
                  <span className="text-sm text-gray-600">Access Level</span>
                  <span className="font-medium">Standard</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Last Login</span>
                  <span className="font-medium text-sm">Today, 9:42 AM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          <div className="border-2 border-gray-400 bg-white">
            <div className="p-6 border-b-2 border-gray-300">
              <h2>Usage Statistics</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Articles Viewed</span>
                    <span className="font-bold">247</span>
                  </div>
                  <div className="text-xs text-gray-500">This month</div>
                </div>
                <div className="pt-4 border-t border-gray-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Searches Made</span>
                    <span className="font-bold">89</span>
                  </div>
                  <div className="text-xs text-gray-500">This month</div>
                </div>
                <div className="pt-4 border-t border-gray-300">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Reports Viewed</span>
                    <span className="font-bold">34</span>
                  </div>
                  <div className="text-xs text-gray-500">This month</div>
                </div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="border-2 border-gray-400 bg-white">
            <div className="p-6 border-b-2 border-gray-300">
              <h2>Security</h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full px-4 py-3 border-2 border-gray-600 bg-white hover:bg-gray-100 text-sm text-left">
                Change Password
              </button>
              <button className="w-full px-4 py-3 border-2 border-gray-600 bg-white hover:bg-gray-100 text-sm text-left">
                Security Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

