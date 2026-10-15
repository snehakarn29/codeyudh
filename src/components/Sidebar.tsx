import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  GitBranch,
  Database,
  FlaskConical,
  FileText,
  LineChart,
  Key,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'playground'
  | 'routing'
  | 'cache'
  | 'experiments'
  | 'logs'
  | 'analytics'
  | 'keys'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  collapsed,
  onToggleCollapse,
}) => {
  const navItems: { id: NavTab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'playground', label: 'Playground', icon: Terminal },
    { id: 'routing', label: 'Model Routing', icon: GitBranch },
    { id: 'cache', label: 'Cache Analytics', icon: Database },
    { id: 'experiments', label: 'Optimization Lab', icon: FlaskConical },
    { id: 'logs', label: 'Request Logs', icon: FileText },
    { id: 'analytics', label: 'Analytics', icon: LineChart },
    { id: 'keys', label: 'API Keys', icon: Key },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-300 transition-all duration-200 ease-in-out border-r border-slate-800 flex flex-col justify-between shrink-0 select-none z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            {!collapsed && (
              <div className="leading-tight truncate">
                <span className="font-bold text-white text-base tracking-tight block">AIValueGuard</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Optimization Core</span>
              </div>
            )}
          </div>
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition-colors hidden md:block"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Navigation list */}
        <nav className="p-2 space-y-1 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer info in sidebar */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800 text-xs text-slate-400">
          <div className="text-[11px] font-semibold text-slate-300">Hackathon Track PS-08</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Team Targaryens · Chandigarh Univ</div>
        </div>
      )}
    </aside>
  );
};
