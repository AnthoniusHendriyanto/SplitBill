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
      "fixed top-2 right-0 z-40 transition-all duration-300 px-5",
      sidebarCollapsed ? "w-[calc(100%-72px)]" : "w-[calc(100%-240px)]"
    )}>
      <div className="flex items-center justify-end h-11 px-4 rounded-2xl backdrop-blur-xl shadow-glass"
        style={{ background: 'rgba(11,16,32,0.7)' }}>
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-[--text-primary]">{user.name || 'User'}</p>
              <p className="text-[8px] text-tertiary">{user.tier === 'premium' ? 'Premium' : 'Free'}</p>
            </div>
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'var(--brand-primary)' }}>
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        ) : (
          <Link to="/login"
            className="h-8 px-4 rounded-xl text-xs font-semibold text-white no-underline border-none outline-none transition-all flex items-center gap-1.5"
            style={{ background: 'var(--brand-primary)' }}>
            <Icon name="login" className="text-sm" />
            Sign In
          </Link>
        )}
      </div>
    </header>
  );
});

export default TopNavBar;
