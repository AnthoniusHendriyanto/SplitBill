import { memo, useState } from 'react';
import Icon from './Icon';
import MobileDrawer from './MobileDrawer';
import ThemeToggle from './ThemeToggle';

function MobileHeader({ onHelpOpen }) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-[--surface-base] border-b border-[--border] flex items-center justify-between px-4 font-sans text-sm">
        <button
          onClick={() => setDrawerOpen(true)}
          className="p-2 -ml-2 rounded-xl hover:bg-white/10 transition-colors cursor-pointer outline-none border-none bg-transparent"
          aria-label="Open menu"
        >
          <Icon name="menu" className="text-xl text-primary" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[--brand-primary] flex items-center justify-center text-[--text-inverse] shadow-sm">
            <Icon name="payments" className="text-base font-bold" />
          </div>
          <span className="text-xl font-extrabold tracking-tighter text-primary">splitmate.</span>
        </div>

        <ThemeToggle />
      </header>

      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} onHelpOpen={onHelpOpen} />
    </>
  );
}

export default memo(MobileHeader);
