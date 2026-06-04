import { memo, useState } from 'react';
import Icon from './Icon';
import MobileDrawer from './MobileDrawer';

function MobileHeader({ onHelpOpen }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="h-14 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 z-40 font-inter text-sm">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none"
          aria-label="Open menu"
        >
          <Icon name="menu" className="text-2xl text-slate-700 dark:text-slate-300" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-md flex items-center justify-center text-white shadow-md">
            <Icon name="payments" className="text-sm" />
          </div>
          <span className="text-base font-bold tracking-tight text-indigo-600 dark:text-indigo-400">SplitMate</span>
        </div>

        <button
          className="p-2 -mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none"
          aria-label="Notifications"
        >
          <Icon name="notifications" className="text-2xl text-slate-600 dark:text-slate-400" />
        </button>
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onHelpOpen={onHelpOpen} />
    </>
  );
}

export default memo(MobileHeader);

