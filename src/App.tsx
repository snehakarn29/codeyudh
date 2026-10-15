import React, { useEffect, useState } from 'react';
import { api, User } from './api';
import { LandingPage } from './components/LandingPage';
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

const DEFAULT_ACTIVE_USER: User = {
  id: 'usr_demo_founder_001',
  email: 'dev@aivalueguard.com',
  fullName: 'Lead Engineer (Targaryens)',
  role: 'admin',
  emailVerified: true,
  createdAt: '2026-09-15T00:00:00.000Z',
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(DEFAULT_ACTIVE_USER);
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Sync user profile from server if customized
    api.getMe()
      .then((res) => {
        if (res.user) {
          setCurrentUser(res.user);
        }
      })
      .catch(() => {});
  }, []);

  const handleRefreshData = () => {
    setRefreshKey((k) => k + 1);
  };

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
          {currentTab === 'landing' && (
            <LandingPage
              onOpenDashboard={() => setCurrentTab('overview')}
              onOpenPlayground={() => setCurrentTab('playground')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
