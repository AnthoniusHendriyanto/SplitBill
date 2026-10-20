import { memo } from 'react';
import Icon from './Icon';
import ThemeToggle from './ThemeToggle';

function MobileHeader({ onMenuOpen }) {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[--border] bg-[--surface-base] px-4 font-sans text-sm">
      <button
        type="button"
        onClick={onMenuOpen}
        className="icon-button -ml-2"
        aria-label="Open menu"
      >
        <Icon name="menu" className="text-xl text-primary" />
      </button>

      <div className="flex items-center gap-2" aria-label="splitmate">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[--brand-primary] text-[--text-inverse] shadow-sm">
          <Icon name="payments" className="text-base font-bold" />
        </div>
        <span className="text-xl font-extrabold tracking-tighter text-primary">splitmate.</span>
      </div>

      <ThemeToggle />
    </header>
  );
}

export default memo(MobileHeader);
