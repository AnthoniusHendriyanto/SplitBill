import { memo } from 'react';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import ThemeToggle from './ThemeToggle';

export default memo(function TopNavBar() {
  const activeTab = useBillStore(s => s.ui.activeTab);
  const updateUI = useBillStore(s => s.updateUI);
  const user = useAuthStore(s => s.user);
  const label = { dashboard: 'Dashboard', bills: 'Split Wizard', history: 'History', settings: 'Settings' }[activeTab];
  return (
    <header className="h-[72px] px-8 flex items-center justify-between border-b border-border" aria-label="Top navigation">
      <p className="text-sm text-secondary">Your space <span className="mx-3 text-tertiary">/</span> <span className="text-primary font-semibold">{label}</span></p>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button onClick={() => updateUI({ activeTab: 'settings' })} className="flex items-center gap-3 rounded-full py-1 pl-3 pr-1 hover:bg-surface-raised" aria-label="Open account settings">
          <span className="text-sm font-semibold max-w-40 truncate">{user?.name || 'Your account'}</span>
          <span className="w-10 h-10 rounded-full bg-brand-primary text-[--text-inverse] flex items-center justify-center font-bold">{user?.name?.charAt(0).toUpperCase() || 'S'}</span>
        </button>
      </div>
    </header>
  );
});
