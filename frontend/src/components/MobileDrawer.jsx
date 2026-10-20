import { memo } from 'react';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import ModalFrame from './ModalFrame';
import ThemeToggle from './ThemeToggle';
import { cn } from '../utils/cn';

const PRIMARY = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'bills', label: 'New split', icon: 'document_scanner' },
  { id: 'groups', label: 'Groups', icon: 'groups' },
  { id: 'history', label: 'History', icon: 'history' },
];

const MORE = [
  { id: 'recurring', label: 'Recurring bills', icon: 'event_repeat' },
  { id: 'imports', label: 'Import expenses', icon: 'upload_file' },
  { id: 'settings', label: 'Settings', icon: 'tune' },
];

export default memo(function MobileDrawer({ open, onClose, onHelpOpen }) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const activeTab = useBillStore(s => s.ui.activeTab);
  const updateUI = useBillStore(s => s.updateUI);

  const go = (tab) => {
    updateUI({ activeTab: tab, ...(tab === 'bills' ? { step: 1 } : {}) });
    onClose();
  };

  const NavButton = ({ item }) => (
    <button
      type="button"
      onClick={() => go(item.id)}
      aria-current={activeTab === item.id ? 'page' : undefined}
      className={cn(
        'flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
        activeTab === item.id ? 'bg-brand-primary text-[--text-inverse]' : 'text-secondary hover:bg-surface-raised hover:text-primary'
      )}
    >
      <Icon name={item.icon} className="text-xl" />
      {item.label}
    </button>
  );

  return (
    <ModalFrame open={open} onClose={onClose} label="Menu" drawer>
      <aside className="flex h-full w-[min(320px,92vw)] flex-col gap-4 border-r border-border bg-surface-elevated p-5">
        <div className="flex items-center justify-between px-1">
          <span className="text-2xl font-extrabold tracking-tighter">splitmate.</span>
          <button type="button" onClick={onClose} aria-label="Close menu" className="icon-button"><Icon name="close" className="text-xl" /></button>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface-base p-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-primary font-bold text-[#151714]">{user?.name?.charAt(0).toUpperCase() || 'S'}</span>
          <div className="min-w-0">
            <p className="truncate font-bold">{user?.name || 'Your account'}</p>
            <p className="text-xs capitalize text-secondary">{user?.tier || 'Free'} plan</p>
          </div>
        </div>

        <nav aria-label="Menu navigation" className="space-y-1">
          {PRIMARY.map(item => <NavButton key={item.id} item={item} />)}
        </nav>

        <div className="pt-3">
          <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-tertiary">More</p>
          <nav aria-label="More navigation" className="space-y-1">
            {MORE.map(item => <NavButton key={item.id} item={item} />)}
          </nav>
        </div>

        <button
          type="button"
          onClick={() => { onClose(); onHelpOpen?.(); }}
          className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-secondary transition-colors hover:bg-surface-raised hover:text-primary"
        >
          <Icon name="help_outline" className="text-xl" />Help Center
        </button>

        <div className="mt-auto space-y-4 border-t-2 border-dashed border-border pt-5">
          <div className="flex items-center justify-between px-1 text-sm text-secondary">
            <span>Appearance</span>
            <ThemeToggle />
          </div>
          <button
            type="button"
            onClick={() => { logout(); onClose(); }}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-secondary transition-colors hover:bg-[--semantic-error-bg] hover:text-[--semantic-error]"
          >
            <Icon name="logout" className="text-xl" />Sign out
          </button>
        </div>
      </aside>
    </ModalFrame>
  );
});
