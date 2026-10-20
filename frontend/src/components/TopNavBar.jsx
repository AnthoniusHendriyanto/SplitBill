import { memo } from 'react';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import ThemeToggle from './ThemeToggle';

const LABELS = {
  dashboard: 'Home',
  bills: 'New split',
  groups: 'Groups',
  history: 'History',
  recurring: 'Recurring bills',
  imports: 'Import expenses',
  settings: 'Settings',
};

export default memo(function TopNavBar() {
  const activeTab = useBillStore(s => s.ui.activeTab);
  const updateUI = useBillStore(s => s.updateUI);
  const user = useAuthStore(s => s.user);
  const label = LABELS[activeTab] || 'Home';

  return (
    <header className="flex h-[72px] items-center justify-between border-b border-border px-6 lg:px-8" aria-label="Top navigation">
      <p className="truncate text-sm text-secondary">
        Your space <span className="mx-2 text-tertiary">/</span>
        <span className="font-semibold text-primary">{label}</span>
      </p>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          type="button"
          onClick={() => updateUI({ activeTab: 'settings' })}
          className="flex min-h-11 items-center gap-3 rounded-full py-1 pl-3 pr-1 transition-colors hover:bg-surface-raised"
          aria-label="Open account settings"
        >
          <span className="max-w-40 truncate text-sm font-semibold">{user?.name || 'Your account'}</span>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-primary font-bold text-[--text-inverse]">
            {user?.name?.charAt(0).toUpperCase() || 'S'}
          </span>
        </button>
      </div>
    </header>
  );
});
