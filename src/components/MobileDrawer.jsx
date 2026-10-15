import { memo } from 'react';
import useAuthStore from '../store/useAuthStore';
import Icon from './Icon';
import ModalFrame from './ModalFrame';
import ThemeToggle from './ThemeToggle';

export default memo(function MobileDrawer({ open, onClose, onHelpOpen }) {
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  return (
    <ModalFrame open={open} onClose={onClose} label="Menu" drawer>
      <aside className="w-[300px] max-w-[90vw] h-full bg-surface-elevated border-r border-border p-6 flex flex-col gap-7">
        <div className="flex items-center justify-between"><span className="text-2xl font-extrabold tracking-tighter">splitmate.</span><button onClick={onClose} aria-label="Close menu" className="icon-button"><Icon name="close" className="text-xl" /></button></div>
        <div className="flex items-center gap-3 py-6 border-y border-border"><span className="w-12 h-12 rounded-full bg-brand-primary text-[#151714] flex items-center justify-center font-bold">{user?.name?.charAt(0).toUpperCase() || 'S'}</span><div className="min-w-0"><p className="font-bold truncate">{user?.name || 'Your account'}</p><p className="text-sm text-secondary capitalize">{user?.tier || 'Free'} plan</p></div></div>
        <button onClick={() => { onClose(); onHelpOpen(); }} className="flex items-center gap-3 min-h-12 text-sm font-semibold"><Icon name="help" className="text-xl" />Help Center</button>
        <button onClick={() => { logout(); onClose(); }} className="flex items-center gap-3 min-h-12 text-sm font-semibold"><Icon name="logout" className="text-xl" />Sign Out</button>
        <div className="mt-auto pt-6 border-t-2 border-dashed border-border"><p className="text-2xl font-extrabold tracking-tight mb-5">Good times.<br />Fair shares.</p><div className="flex items-center justify-between text-sm text-secondary">Appearance<ThemeToggle /></div></div>
      </aside>
    </ModalFrame>
  );
});
