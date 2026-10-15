import React from 'react';
import { User, api } from '../api';
import { NavTab } from './Sidebar';
import { LogOut, Activity, User as UserIcon, Trash2 } from 'lucide-react';

interface TopBarProps {
  currentTab: NavTab;
  user: User;
  onLogout?: () => void;
  onRefreshData?: () => void;
}

const TAB_TITLES: Record<NavTab, { title: string; subtitle: string }> = {
  overview: {
    title: 'Overview Dashboard',
    subtitle: 'Audited AI cost savings, request volume, and quality verification',
  },
  playground: {
    title: 'AI Playground',
    subtitle: 'Submit requests to test adaptive routing, caching, and context optimization',
  },
  routing: {
    title: 'Model Routing Engine',
    subtitle: 'Model catalog, token pricing, quality profiles, and strategy frontier simulator',
  },
  cache: {
    title: 'Cache Analytics & Controls',
    subtitle: 'Safe exact-match response caching, hit rates, and avoided provider charges',
  },
  experiments: {
    title: 'Optimization Laboratory',
    subtitle: 'Benchmark baseline vs. optimized pipelines with p95 latency and quality validation',
  },
  logs: {
    title: 'Request Logs & Audit',
    subtitle: 'Complete searchable audit trail of inference requests, tokens, and net savings',
  },
  analytics: {
    title: 'Economics & Analytics',
    subtitle: 'Detailed cost trajectories, latency distributions, and efficiency trends',
  },
  keys: {
    title: 'API Keys & Gateway',
    subtitle: 'Secure API key generation and OpenAI-compatible proxy gateway endpoints',
  },
  landing: {
    title: 'Platform Architecture & Guide',
    subtitle: 'System architecture, 3-stage optimization pipeline, and platform capabilities',
  },
  settings: {
    title: 'System Settings',
    subtitle: 'Profile, security sessions, upstream provider credentials, and optimization policies',
  },
};

export const TopBar: React.FC<TopBarProps> = ({ currentTab, user, onRefreshData }) => {
  const current = TAB_TITLES[currentTab] || { title: 'Dashboard', subtitle: '' };

  const handleClearDemo = async () => {
    if (confirm('Clear seeded demo records? Your dashboard will then show only real live executions.')) {
      try {
        await api.resetDemoData();
        if (onRefreshData) onRefreshData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 z-20">
      <div>
        <h1 className="text-base font-bold text-slate-900 leading-tight">{current.title}</h1>
        <p className="text-xs text-slate-500 hidden sm:block">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-4">
        {/* Provider Status */}
        <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-emerald-50 border border-emerald-200 rounded-md text-xs font-medium text-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Gemini GenAI Gateway: Operational</span>
        </div>

        {/* Clear Demo Data Button */}
        <button
          onClick={handleClearDemo}
          title="Remove seeded demonstration records"
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-md transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Demo Data</span>
        </button>

        {/* User avatar */}
        <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700 font-semibold text-xs">
              {user.fullName ? user.fullName[0].toUpperCase() : 'U'}
            </div>
            <div className="hidden md:block text-left">
              <div className="text-xs font-semibold text-slate-900 leading-none">{user.fullName}</div>
              <div className="text-[11px] text-slate-500 leading-tight truncate max-w-[140px]">{user.email}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
