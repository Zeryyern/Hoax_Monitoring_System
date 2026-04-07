import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Navigation } from '@/app/components/Navigation';
import { Footer } from '@/app/components/Footer';
import { AdminSidebar } from '@/app/components/AdminSidebar';
import { UserSidebar } from '@/app/components/UserSidebar';
import { DashboardFooter } from '@/app/components/DashboardFooter';
import { HomePage } from '@/app/pages/HomePage';
import { AboutPage } from '@/app/pages/AboutPage';
import { NewsPage } from '@/app/pages/NewsPage';
import { LoginPage } from '@/app/pages/LoginPage';
import { UserLoginPage } from '@/app/pages/UserLoginPage';
import { SignupPage } from '@/app/pages/SignupPage';
import { ForgotPasswordPage } from '@/app/pages/ForgotPasswordPage';
import { DashboardPage } from '@/app/pages/admin/DashboardPage';
import { AdminUserManagement } from '@/app/pages/admin/AdminUserManagement';
import { AdminLogsPage } from '@/app/pages/admin/AdminLogsPage';
import { ScrapingPage } from '@/app/pages/admin/ScrapingPage';
import { NLPResultsPage } from '@/app/pages/admin/NLPResultsPage';
import { VisualizationPage } from '@/app/pages/admin/VisualizationPage';
import { PasswordResetTicketsPage } from '@/app/pages/admin/PasswordResetTicketsPage';
import { AdminHoaxAnalyticsPage } from '@/app/pages/admin/AdminHoaxAnalyticsPage';
import { ProfilePage } from '@/app/pages/user/ProfilePage';
import { UserOverviewPage } from '@/app/pages/user/UserOverviewPage';
import { UserNewsMonitoringPage } from '@/app/pages/user/UserNewsMonitoringPage';
import { UserAnalyticsPage } from '@/app/pages/user/UserAnalyticsPage';

function AppContent() {
  const { user, isLoading, logout, login, register } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [adminPage, setAdminPage] = useState('dashboard');
  const [userPage, setUserPage] = useState('overview');

  useEffect(() => {
    const goHomeOnLogout = () => {
      setCurrentPage('home');
      setAdminPage('dashboard');
      setUserPage('overview');
    };
    window.addEventListener('auth:logged-out', goHomeOnLogout);
    window.addEventListener('auth:idle-logout', goHomeOnLogout);
    window.addEventListener('auth:expired', goHomeOnLogout);
    return () => {
      window.removeEventListener('auth:logged-out', goHomeOnLogout);
      window.removeEventListener('auth:idle-logout', goHomeOnLogout);
      window.removeEventListener('auth:expired', goHomeOnLogout);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    logout();
    setCurrentPage('home');
  };

  const handleUserLogin = async (email: string, password: string) => {
    const result = await login(email, password, 'user');
    if (result.success) {
      setCurrentPage('home');
      return { success: true };
    }
    return { success: false, error: result.error || 'Login failed' };
  };

  const handleAdminLogin = async (email: string, password: string) => {
    const result = await login(email, password, 'admin');
    if (!result.success || !result.user) {
      return { success: false, error: result.error || 'Login failed' };
    }

    if (result.user.role !== 'admin') {
      logout();
      return { success: false, error: 'Admin access required' };
    }

    return { success: true };
  };

  const handleSignup = async (username: string, email: string, password: string) => {
    return register(username, email, password);
  };

  // Admin Dashboard
  if (user?.role === 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row overflow-x-hidden pt-[76px] md:pt-0">
        <AdminSidebar
          currentPage={adminPage}
          onNavigate={setAdminPage}
          onLogout={handleLogout}
          userName={user.username}
          userId={user.id}
        />
        <main className="flex-1 overflow-y-auto md:h-screen min-w-0 w-full">
          <div className="min-h-full flex flex-col">
            {adminPage === 'dashboard' && <DashboardPage />}
            {adminPage === 'user-management' && <AdminUserManagement />}
            {adminPage === 'logs' && <AdminLogsPage />}
            {adminPage === 'password-reset-tickets' && <PasswordResetTicketsPage />}
            {adminPage === 'scraping' && <ScrapingPage />}
            {adminPage === 'nlp' && <NLPResultsPage />}
            {adminPage === 'visualization' && <VisualizationPage />}
            {adminPage === 'hoax-analytics' && <AdminHoaxAnalyticsPage />}
            <DashboardFooter area="admin" />
          </div>
        </main>
      </div>
    );
  }

  // User Dashboard
  if (user?.role === 'user') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row overflow-x-hidden pt-[76px] md:pt-0">
        <UserSidebar
          currentPage={userPage}
          onNavigate={setUserPage}
          onLogout={handleLogout}
          userName={user.username}
        />
        <main className="flex-1 overflow-y-auto md:h-screen min-w-0 w-full">
          <div className="min-h-full flex flex-col">
            {userPage === 'overview' && <UserOverviewPage />}
            {userPage === 'news-monitoring' && <UserNewsMonitoringPage />}
            {userPage === 'analytics' && <UserAnalyticsPage />}
            {userPage === 'profile' && <ProfilePage />}
            <DashboardFooter area="user" />
          </div>
        </main>
      </div>
    );
  }

  // Public pages with fixed navigation and footer
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Navigation 
        currentPage={currentPage} 
        onNavigate={setCurrentPage}
        isLoggedIn={!!user}
        isAdmin={user?.role === 'admin'}
        userName={user?.username}
        onLogout={handleLogout}
      />
      <main className="flex-1 pt-20">
        {currentPage === 'home' && <HomePage onNavigate={setCurrentPage} />}
        {currentPage === 'about' && <AboutPage onNavigate={setCurrentPage} />}
        {currentPage === 'news' && <NewsPage />}
        {currentPage === 'login' && (
          <UserLoginPage 
            onLogin={handleUserLogin}
            onNavigateToSignup={() => setCurrentPage('signup')}
            onNavigateToAdminLogin={() => setCurrentPage('admin-login')}
            onNavigateToForgotPassword={() => setCurrentPage('forgot-password-user')}
          />
        )}
        {currentPage === 'admin-login' && (
          <LoginPage 
            onLogin={handleAdminLogin}
            onNavigateToUserLogin={() => setCurrentPage('login')}
            onNavigateToForgotPassword={() => setCurrentPage('forgot-password-admin')}
          />
        )}
        {currentPage === 'forgot-password-user' && (
          <ForgotPasswordPage mode="user" onBack={() => setCurrentPage('login')} />
        )}
        {currentPage === 'forgot-password-admin' && (
          <ForgotPasswordPage mode="admin" onBack={() => setCurrentPage('admin-login')} />
        )}
        {currentPage === 'signup' && (
          <SignupPage 
            onSignup={handleSignup}
            onNavigateToLogin={() => setCurrentPage('login')}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
