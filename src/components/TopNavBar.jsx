import { memo } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const TopNavBar = memo(() => {
  const ui = useBillStore((s) => s.ui);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = !!accessToken;

  const sidebarCollapsed = ui?.sidebarCollapsed ?? false;

  return (
    <header aria-label="Top navigation" className={cn(
      "fixed top-0 right-0 h-16 bg-card/80 backdrop-blur-md border-b border flex justify-between items-center px-8 z-40 font-inter text-sm transition-all duration-300",
      sidebarCollapsed ? "w-[calc(100%-80px)]" : "w-[calc(100%-280px)]"
    )}>
      {/* Search Input */}
      <div className="flex items-center gap-4 flex-1 max-w-md">
        <div className="relative w-full">
          <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary text-lg" />
          <input
            className="w-full pl-10 pr-4 py-2 bg-surface-base/60 border border rounded-xl focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all text-xs font-medium placeholder-slate-500 text-primary outline-none"
            placeholder="Search transactions, bills, or friends..."
            type="text"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4 text-secondary">
          <button aria-label="Notifications" className="p-2 bg-surface-base/40 border border/50 rounded-xl hover:text-indigo-400 hover:border-indigo-950 transition-all cursor-pointer">
            <Icon name="notifications" className="text-lg" />
          </button>
          <button aria-label="History" className="p-2 bg-surface-base/40 border border/50 rounded-xl hover:text-indigo-400 hover:border-indigo-950 transition-all cursor-pointer">
            <Icon name="history" className="text-lg" />
          </button>
        </div>
        <div className="h-6 w-px bg-surface-elevated"></div>
        <div className="flex items-center gap-3">
          {isAuthenticated && user ? (
            <div className="flex items-center gap-3 bg-surface-base/40 border border px-3.5 py-1.5 rounded-2xl">
              <div className="text-right">
                <p className="text-xs font-black text-primary leading-tight">{user.name || 'User'}</p>
                <p className={cn(
                  "text-[8px] uppercase tracking-widest font-extrabold mt-0.5",
                  user.tier === 'premium' ? "text-indigo-400" : "text-indigo-400"
                )}>{user.tier || 'free'}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-600 flex items-center justify-center text-white text-xs font-extrabold ring-2 ring-indigo-500/30">
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-bold text-xs hover:from-indigo-700 hover:to-indigo-700 transition-all shadow-lg shadow-indigo-500/20 no-underline border-none outline-none"
            >
              <Icon name="login" className="text-sm" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
});

export default TopNavBar;
