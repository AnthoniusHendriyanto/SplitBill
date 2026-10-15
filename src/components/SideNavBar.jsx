import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
  { id: 'bills', label: 'Split Wizard', icon: 'call_split' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'settings', label: 'Settings', icon: 'tune' },
];

const SideNavBar = memo(({ onHelpOpen }) => {
  const ui = useBillStore((s) => s.ui);
  const updateUI = useBillStore((s) => s.updateUI);
  const logout = useAuthStore((s) => s.logout);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = !!accessToken;
  const activeTab = ui?.activeTab ?? 'bills';
  const sidebarCollapsed = ui?.sidebarCollapsed ?? false;

  const setActiveTab = (tab) => updateUI({ activeTab: tab });

  return (
    <aside aria-label="Sidebar" className={cn(
      "fixed left-0 top-0 h-full flex flex-col font-sans antialiased z-50 transition-all duration-300",
      "bg-[--surface-elevated] border-r border-[--border]",
      sidebarCollapsed ? "w-[72px]" : "w-[240px]"
    )}>
      {/* Brand */}
      <div className={cn("h-[72px] flex items-center px-5", sidebarCollapsed && "justify-center px-0")}>
        <Link to="/" className="flex items-center gap-3.5 no-underline group">
          <div className="w-10 h-10 rounded-2xl bg-[--brand-primary] flex items-center justify-center text-[--text-inverse] shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <Icon name="payments" className="text-xl font-bold" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-xl font-extrabold tracking-tighter text-[--text-primary] leading-tight">splitmate<span className="text-brand-primary">.</span></span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Nav */}
      <nav aria-label="Main navigation" className="flex-1 py-8 px-3 space-y-2 overflow-y-auto hide-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (item.id === 'bills') updateUI({ step: 1 }); }}
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "w-full flex items-center gap-3.5 px-3.5 py-3.5 rounded-xl transition-all relative group cursor-pointer border-none outline-none text-sm font-semibold",
                isActive
                  ? "text-[--text-inverse] bg-brand-primary"
                  : "text-secondary hover:text-primary hover:bg-surface-raised"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute right-3 w-1.5 h-1.5 bg-[--text-inverse] rounded-full"
                />
              )}
              <Icon
                name={item.icon}
                className={cn("text-xl transition-colors shrink-0", isActive ? "text-[--text-inverse]" : "text-secondary")}
              />
              {!sidebarCollapsed && (
                <span className={cn(isActive ? "text-[--text-inverse] font-bold" : "")}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      {!sidebarCollapsed && <div className="mx-5 mb-6 border-t-2 border-dashed border-border pt-5"><p className="text-xl font-extrabold tracking-tight leading-tight">Good times.<br />Fair shares.</p><p className="text-xs text-secondary mt-2">You bring the people.</p></div>}
      <div className="border-t border-[--border] py-3 px-3 space-y-1">
        <button
          onClick={onHelpOpen}
          aria-label="Help Center"
          title={sidebarCollapsed ? 'Help Center' : undefined}
          className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-white/[0.03] transition-all cursor-pointer border-none outline-none text-xs font-medium"
        >
          <Icon name="help_outline" className="text-lg text-[--text-tertiary]" />
          {!sidebarCollapsed && <span>Help & Support</span>}
        </button>

        {isAuthenticated && (
          <button
            onClick={() => { logout(); }}
            aria-label="Logout"
            title={sidebarCollapsed ? 'Logout' : undefined}
            className="w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[--text-tertiary] hover:text-[--semantic-error] hover:bg-[--semantic-error-bg] transition-all cursor-pointer border-none outline-none text-xs font-medium"
          >
            <Icon name="logout" className="text-lg text-[--text-tertiary]" />
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        )}

        <button
          onClick={() => updateUI({ sidebarCollapsed: !sidebarCollapsed })}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center justify-center p-2 rounded-xl text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-white/[0.03] transition-all cursor-pointer border-none outline-none mt-2"
        >
          <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} className="text-xl" />
        </button>
      </div>
    </aside>
  );
});

export default SideNavBar;
