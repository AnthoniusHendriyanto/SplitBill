import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const PRIMARY_NAV = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'bills', label: 'New split', icon: 'call_split' },
  { id: 'groups', label: 'Groups', icon: 'groups' },
  { id: 'history', label: 'History', icon: 'history' },
];

const TOOL_NAV = [
  { id: 'recurring', label: 'Recurring', icon: 'event_repeat' },
  { id: 'imports', label: 'Import', icon: 'upload_file' },
  { id: 'settings', label: 'Settings', icon: 'tune' },
];

const SideNavBar = memo(({ onHelpOpen }) => {
  const ui = useBillStore((s) => s.ui);
  const updateUI = useBillStore((s) => s.updateUI);
  const logout = useAuthStore((s) => s.logout);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = !!accessToken;
  const activeTab = ui?.activeTab ?? 'dashboard';
  const sidebarCollapsed = ui?.sidebarCollapsed ?? false;

  const setActiveTab = (tab) => updateUI({ activeTab: tab, ...(tab === 'bills' ? { step: 1 } : {}) });

  const NavItem = ({ item }) => {
    const isActive = activeTab === item.id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(item.id)}
        title={sidebarCollapsed ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'group relative flex min-h-12 w-full items-center gap-3.5 rounded-xl px-3.5 text-sm font-semibold transition-colors',
          isActive
            ? 'bg-brand-primary text-[--text-inverse]'
            : 'text-secondary hover:bg-surface-raised hover:text-primary'
        )}
      >
        {isActive && (
          <motion.span
            layoutId="sidebar-active-indicator"
            className="absolute right-3 h-1.5 w-1.5 rounded-full bg-[--text-inverse]"
          />
        )}
        <Icon
          name={item.icon}
          className={cn('shrink-0 text-xl transition-colors', isActive ? 'text-[--text-inverse]' : 'text-secondary')}
        />
        {!sidebarCollapsed && <span className={cn(isActive && 'font-bold')}>{item.label}</span>}
      </button>
    );
  };

  return (
    <aside aria-label="Sidebar" className={cn(
      'fixed left-0 top-0 z-50 flex h-full flex-col border-r border-[--border] bg-[--surface-elevated] font-sans antialiased transition-[width] duration-300',
      sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
    )}>
      <div className={cn('flex h-[72px] items-center border-b border-border px-5', sidebarCollapsed && 'justify-center px-0')}>
        <Link to="/" className="group flex items-center gap-3.5 no-underline">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[--brand-primary] text-[--text-inverse] shadow-sm transition-transform group-hover:scale-105">
            <Icon name="payments" className="text-xl font-bold" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-xl font-extrabold leading-tight tracking-tighter text-[--text-primary]">
              splitmate<span className="text-brand-primary">.</span>
            </span>
          )}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-5 hide-scrollbar">
        <nav aria-label="Main navigation" className="space-y-1">
          {PRIMARY_NAV.map(item => <NavItem key={item.id} item={item} />)}
        </nav>

        <div className="mt-6">
          {!sidebarCollapsed && <p className="px-3.5 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-tertiary">Tools</p>}
          {sidebarCollapsed && <div className="mx-3 mb-2 border-t border-border" />}
          <nav aria-label="Tools navigation" className="space-y-1">
            {TOOL_NAV.map(item => <NavItem key={item.id} item={item} />)}
          </nav>
        </div>
      </div>

      <div className="space-y-1 border-t border-[--border] px-3 py-3">
        <button
          type="button"
          onClick={onHelpOpen}
          aria-label="Help Center"
          title={sidebarCollapsed ? 'Help Center' : undefined}
          className="flex min-h-11 w-full items-center gap-3.5 rounded-xl px-3.5 text-xs font-medium text-[--text-tertiary] transition-colors hover:bg-surface-raised hover:text-[--text-secondary]"
        >
          <Icon name="help_outline" className="text-lg text-[--text-tertiary]" />
          {!sidebarCollapsed && <span>Help & support</span>}
        </button>

        {isAuthenticated && (
          <button
            type="button"
            onClick={() => logout()}
            aria-label="Logout"
            title={sidebarCollapsed ? 'Logout' : undefined}
            className="flex min-h-11 w-full items-center gap-3.5 rounded-xl px-3.5 text-xs font-medium text-[--text-tertiary] transition-colors hover:bg-[--semantic-error-bg] hover:text-[--semantic-error]"
          >
            <Icon name="logout" className="text-lg text-[--text-tertiary]" />
            {!sidebarCollapsed && <span>Sign out</span>}
          </button>
        )}

        <button
          type="button"
          onClick={() => updateUI({ sidebarCollapsed: !sidebarCollapsed })}
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="mt-1 flex min-h-10 w-full items-center justify-center rounded-xl p-2 text-[--text-tertiary] transition-colors hover:bg-surface-raised hover:text-[--text-secondary]"
        >
          <Icon name={sidebarCollapsed ? 'chevron_right' : 'chevron_left'} className="text-xl" />
        </button>
      </div>
    </aside>
  );
});

export default SideNavBar;
