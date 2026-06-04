import { memo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

function MobileDrawer({ open, onClose, onHelpOpen }) {
  const settings = useBillStore((s) => s.settings);
  const updateSettings = useBillStore((s) => s.updateSettings);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-40"
          />

          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-[280px] bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-gray-800 flex flex-col py-6 z-50 shadow-2xl"
          >
            <div className="px-6 mb-8">
              <div className="flex items-center justify-between">
                <Link to="/" onClick={onClose} className="flex items-center gap-3 no-underline">
                  <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Icon name="payments" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-lg font-bold tracking-tight text-indigo-600 dark:text-indigo-400">SplitMate</span>
                    <span className="text-[9px] text-slate-500 uppercase tracking-widest">Financial Ledger</span>
                  </div>
                </Link>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer outline-none"
                  aria-label="Close menu"
                >
                  <Icon name="close" className="text-xl text-slate-500" />
                </button>
              </div>
            </div>

            {/* User info */}
            {isAuthenticated && user && (
              <div className="px-3 mb-4">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{user.name || 'User'}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">{user.tier || 'free'}</p>
                  </div>
                </div>
              </div>
            )}

            <nav className="flex-1 px-3 space-y-1">
              <p className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quick Actions</p>
              <button
                onClick={() => { onClose(); onHelpOpen(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer outline-none text-sm font-medium"
              >
                <Icon name="help" className="text-lg" />
                Help Center
              </button>
              {isAuthenticated ? (
                <button
                  onClick={() => { logout(); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-500 hover:text-red-600 dark:hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-red-500 text-sm font-medium"
                >
                  <Icon name="logout" className="text-lg" />
                  Logout
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={onClose}
                  className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer outline-none no-underline text-sm font-medium"
                >
                  <Icon name="login" className="text-lg" />
                  Sign In
                </Link>
              )}
            </nav>

            <div className="mt-auto border-t border-gray-200 dark:border-gray-800 pt-4 px-3 space-y-4">
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Appearance</p>
              <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                  <Icon name={settings.darkMode ? "dark_mode" : "light_mode"} className="text-lg text-slate-500" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dark Mode</span>
                </div>
                <div role="switch" tabIndex={0} aria-checked={settings.darkMode}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      const newMode = !settings.darkMode;
                      updateSettings({ darkMode: newMode });
                      document.documentElement.classList.toggle('dark', newMode);
                    }
                  }}
                  onClick={() => {
                    const newMode = !settings.darkMode;
                    updateSettings({ darkMode: newMode });
                    document.documentElement.classList.toggle('dark', newMode);
                  }}
                  className={cn(
                    "w-11 h-5 rounded-full relative cursor-pointer transition-colors duration-300",
                    settings.darkMode ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                  )}
                >
                  <motion.div
                    layout
                    animate={{ x: settings.darkMode ? 24 : 2 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm"
                  />
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

export default memo(MobileDrawer);
