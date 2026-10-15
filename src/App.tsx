import React, { useEffect, useState } from 'react';
import { api, User } from './api';
import { LandingPage } from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { Sidebar, NavTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { PlaygroundView } from './components/PlaygroundView';
import { ModelRoutingView } from './components/ModelRoutingView';
import { CacheAnalyticsView } from './components/CacheAnalyticsView';
import { OptimizationLabView } from './components/OptimizationLabView';
import { RequestLogsView } from './components/RequestLogsView';
import { AnalyticsView } from './components/AnalyticsView';
import { ApiKeysView } from './components/ApiKeysView';
import { SettingsView } from './components/SettingsView';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register' | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check if session exists on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.getMe();
        setCurrentUser(res.user);
      } catch {
        // Not logged in or expired session
        setCurrentUser(null);
      } finally {
        setLoadingUser(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error(err);
    }
    setCurrentUser(null);
    setCurrentTab('overview');
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthModalMode(null);
    setCurrentTab('overview');
  };

  const handleRefreshData = () => {
    setRefreshKey((k) => k + 1);
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Initializing AIValueGuard...</span>
        </div>
      </div>
    );
  }

  // If unauthenticated, show public landing page + optional auth modal
  if (!currentUser) {
    return (
      <>
        <LandingPage
          onGetStarted={() => setAuthModalMode('register')}
          onLogin={() => setAuthModalMode('login')}
        />
        {authModalMode && (
          <AuthModal
            initialMode={authModalMode}
            onSuccess={handleAuthSuccess}
            onClose={() => setAuthModalMode(null)}
          />
        )}
      </>
    );
  }

  // Authenticated Dashboard Layout
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopBar
          currentTab={currentTab}
          user={currentUser}
          onLogout={handleLogout}
          onRefreshData={handleRefreshData}
        />

        <main className="flex-1 overflow-y-auto">
          {currentTab === 'overview' && (
            <OverviewDashboard key={refreshKey} onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'playground' && (
            <PlaygroundView onNavigateTab={(tab) => setCurrentTab(tab)} />
          )}
          {currentTab === 'routing' && <ModelRoutingView />}
          {currentTab === 'cache' && <CacheAnalyticsView />}
          {currentTab === 'experiments' && <OptimizationLabView />}
          {currentTab === 'logs' && <RequestLogsView />}
          {currentTab === 'analytics' && <AnalyticsView key={refreshKey} />}
          {currentTab === 'keys' && <ApiKeysView />}
          {currentTab === 'settings' && (
            <SettingsView
              currentUser={currentUser}
              onUpdateUser={(u) => setCurrentUser(u)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
