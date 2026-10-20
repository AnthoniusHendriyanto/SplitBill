import { memo } from 'react';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const TABS = [
  { id: 'dashboard', label: 'Home', icon: 'home' },
  { id: 'bills', label: 'Split', icon: 'document_scanner' },
  { id: 'groups', label: 'Groups', icon: 'groups' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'more', label: 'More', icon: 'more_horiz' },
];

const MORE_TABS = new Set(['recurring', 'imports', 'settings']);

function BottomTabBar({ onMoreOpen, moreOpen = false }) {
  const ui = useBillStore((s) => s.ui);
  const updateUI = useBillStore((s) => s.updateUI);
  const activeTab = ui?.activeTab ?? 'dashboard';
  const step = ui?.step ?? 1;

  const setActiveTab = (tab) => updateUI({ activeTab: tab });
  const setStep = (newStep) => updateUI({ step: typeof newStep === 'function' ? newStep(step) : newStep });

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-[--border] bg-[--surface-elevated] px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_#25310c0a]"
    >
      {TABS.map((tab) => {
        const isMore = tab.id === 'more';
        const isActive = isMore ? moreOpen || MORE_TABS.has(activeTab) : activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              if (isMore) {
                onMoreOpen?.();
                return;
              }
              setActiveTab(tab.id);
              if (tab.id === 'bills') setStep(1);
            }}
            aria-current={isActive && !isMore ? 'page' : undefined}
            aria-label={tab.label}
            aria-expanded={isMore ? moreOpen : undefined}
            className={cn(
              'relative flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors',
              isActive ? 'text-primary' : 'text-tertiary hover:text-secondary'
            )}
          >
            <span
              className={cn(
                'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
                isActive ? 'bg-brand-primary text-[--text-inverse]' : 'bg-transparent'
              )}
            >
              <Icon name={tab.icon} className="text-xl" />
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default memo(BottomTabBar);
