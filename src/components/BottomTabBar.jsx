import { memo } from 'react';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const TABS = [
  { id: 'dashboard', label: 'Home', icon: 'grid_view' },
  { id: 'bills', label: 'Split', icon: 'document_scanner' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'settings', label: 'Settings', icon: 'tune' },
];

function BottomTabBar() {
  const ui = useBillStore((s) => s.ui);
  const updateUI = useBillStore((s) => s.updateUI);
  const activeTab = ui?.activeTab ?? 'bills';
  const step = ui?.step ?? 1;

  const setActiveTab = (tab) => updateUI({ activeTab: tab });
  const setStep = (newStep) => updateUI({ step: typeof newStep === 'function' ? newStep(step) : newStep });

  return (
    <nav aria-label="Bottom navigation" className="fixed bottom-0 left-0 right-0 min-h-[76px] pb-[env(safe-area-inset-bottom)] bg-[--surface-elevated] border-t border-[--border] flex items-center justify-around z-40">
      {TABS.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              if (tab.id === 'bills') setStep(1);
            }}
            aria-current={isActive ? 'page' : undefined}
            aria-label={tab.label}
            className={cn(
              "flex flex-col items-center justify-center gap-1 my-2 py-2 px-4 rounded-xl transition-all relative cursor-pointer outline-none border-none",
              isActive ? "bg-brand-primary text-[--text-inverse] font-bold" : "text-secondary"
            )}
          >
            <Icon name={tab.icon} className="text-xl" />
            <span className="text-xs font-semibold">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default memo(BottomTabBar);
