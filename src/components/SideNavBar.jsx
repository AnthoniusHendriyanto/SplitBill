import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'bills', label: 'Bills', icon: 'receipt_long' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const SideNavBar = memo(({ onHelpOpen }) => {
  const ui = useBillStore((s) => s.ui);
  const updateUI = useBillStore((s) => s.updateUI);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = !!accessToken;
  const activeTab = ui?.activeTab ?? 'bills';
  const step = ui?.step ?? 1;
  const sidebarCollapsed = ui?.sidebarCollapsed ?? false;

  const setActiveTab = (tab) => updateUI({ activeTab: tab });

  return (
    <aside aria-label="Sidebar" className={cn(
      "fixed left-0 top-0 h-full flex flex-col font-inter antialiased z-50 transition-all duration-300",
      "bg-[--surface-elevated] shadow-card",
      sidebarCollapsed ? "w-[72px]" : "w-[200px]"
    )}>
      {/* Brand */}
      <div className={cn("h-14 flex items-center px-4 border-b border-[--border]", sidebarCollapsed && "justify-center px-0")}>
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="w-8 h-8 rounded-[10px] bg-[--brand-primary] flex items-center justify-center text-white shadow-lg shrink-0">
            <Icon name="payments" className="text-base" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-[--text-primary] leading-tight">SplitMate</span>
              <span className="text-[8px] font-medium text-tertiary leading-tight">Split Bills</span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Nav */}
      <nav aria-label="Main navigation" className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto hide-scrollbar">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); if (item.id === 'bills') updateUI({ step: 1 }); }}
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all relative group cursor-pointer border-none outline-none text-xs",
                isActive
                  ? "font-semibold"
                  : "text-tertiary/70 hover:text-[--text-secondary]"
              )}
              style={isActive ? { background: 'rgba(124,92,255,0.1)' } : {}}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute left-0 w-[2px] h-4 bg-[--brand-primary] rounded-r-full"
                />
              )}
              <Icon
                name={item.icon}
                className={cn("text-base transition-all shrink-0", isActive ? "text-[--brand-primary]" : "text-tertiary/60")}
              />
              {!sidebarCollapsed && (
                <span className={cn("tracking-tight", isActive ? "text-[--brand-primary]" : "")}>
                  {item.label}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-[--border] py-2 px-2 space-y-0.5">
        <button
          onClick={onHelpOpen}
          aria-label="Help Center"
          title={sidebarCollapsed ? 'Help Center' : undefined}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-tertiary/70 hover:text-[--text-secondary] transition-all cursor-pointer border-none outline-none text-xs"
        >
          <Icon name="help" className="text-base text-tertiary/60" />
          {!sidebarCollapsed && <span>Help</span>}
        </button>

        {isAuthenticated && (
          <button
            onClick={() => { logout(); }}
            aria-label="Logout"
            title={sidebarCollapsed ? 'Logout' : undefined}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-tertiary/70 hover:text-red-400 transition-all cursor-pointer border-none outline-none text-xs"
          >
            <Icon name="logout" className="text-base text-tertiary/60" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        )}

        {isAuthenticated && user ? (
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-7 h-7 rounded-lg bg-[--brand-primary-subtle] flex items-center justify-center text-[--brand-primary] text-[10px] font-bold shrink-0">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 text-left min-w-0">
                <p className="text-xs font-semibold text-[--text-primary] truncate">{user.name || 'User'}</p>
                <p className="text-[8px] font-medium text-tertiary">{user.tier === 'premium' ? 'Premium' : 'Free'}</p>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" title={sidebarCollapsed ? 'Sign In' : undefined}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[--brand-primary] hover:bg-[--brand-primary-subtle] transition-all no-underline text-xs"
          >
            <Icon name="login" className="text-base" />
            {!sidebarCollapsed && <span className="font-semibold">Sign In</span>}
          </Link>
        )}

        <button
          onClick={() => updateUI({ sidebarCollapsed: !sidebarCollapsed })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-tertiary/70 hover:text-[--text-secondary] transition-all cursor-pointer border-none outline-none text-[10px]"
        >
          <Icon name={sidebarCollapsed ? 'keyboard_double_arrow_right' : 'keyboard_double_arrow_left'} className="text-sm" />
          {!sidebarCollapsed && <span className="font-semibold uppercase tracking-wider">Collapse</span>}
        </button>
      </div>
    </aside>
  );
});

export default SideNavBar;
