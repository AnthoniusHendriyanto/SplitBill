import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'bills', label: 'Bills', icon: 'receipt_long' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const SideNavBar = memo(({ onHelpOpen }) => {
  const ui = useBillStore((s) => s.ui);
  const updateUI = useBillStore((s) => s.updateUI);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = !!accessToken;
  const logout = useAuthStore((state) => state.logout);
  const activeTab = ui?.activeTab ?? 'bills';
  const step = ui?.step ?? 1;

  const sidebarCollapsed = ui?.sidebarCollapsed ?? false;

  const setActiveTab = (tab) => updateUI({ activeTab: tab });
  const setStep = (newStep) => updateUI({ step: typeof newStep === 'function' ? newStep(step) : newStep });

  return (
    <aside aria-label="Sidebar" className={cn(
      "fixed left-0 top-0 h-full border-r bg-card border-slate-900 flex flex-col py-6 font-inter antialiased text-sm font-medium z-50 shadow-2xl transition-all duration-300",
      sidebarCollapsed ? "w-20" : "w-[280px]"
    )}>
      {/* Brand Header */}
      <div className={cn("px-6 mb-8 flex items-center justify-between", sidebarCollapsed && "px-4 justify-center")}>
        <Link to="/" className="flex items-center gap-3 no-underline">
          <motion.div 
            initial={{ rotate: -10, scale: 0.9 }}
            animate={{ rotate: 0, scale: 1 }}
            className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20"
          >
            <Icon name="payments" className="text-lg" />
          </motion.div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-indigo-300 text-lg font-black tracking-tight"><span className="bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent">SplitMate</span></span>
              <span className="text-[9px] text-indigo-400/70 font-bold uppercase tracking-widest leading-none">Financial Ledger</span>
            </div>
          )}
        </Link>
      </div>

      {/* Main Nav Items */}
      <nav aria-label="Main navigation" className="flex-1 space-y-1.5 px-3">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all relative group cursor-pointer focus:border-none outline-none border-none",
                isActive 
                  ? "text-indigo-400 font-bold bg-indigo-950/40 border-none" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
              )}
            >
              {isActive && (
                <motion.div 
                  layoutId="nav-pill"
                  className="absolute left-0 w-1.5 h-6 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-r-full"
                />
              )}
              <Icon 
                name={item.icon} 
                className={cn(
                  "text-lg transition-transform group-hover:scale-110", 
                  isActive ? "text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "text-slate-400"
                )} 
              />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* New Bill Button */}
      <div className={cn("px-4 mb-4", sidebarCollapsed && "px-3")}>
        <motion.button 
          whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(99, 102, 241, 0.4)" }}
          whileTap={{ scale: 0.97 }}
          onClick={() => { setActiveTab('bills'); setStep(1); }}
          title={sidebarCollapsed ? "New Bill" : undefined}
          className={cn(
            "w-full bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white font-bold flex items-center justify-center gap-2 cursor-pointer border-none outline-none transition-all py-3.5 shadow-lg shadow-indigo-600/30",
            sidebarCollapsed ? "h-12 w-12 rounded-xl p-0 mx-auto" : "px-4"
          )}
        >
          <Icon name="add" className="text-xl" />
          {!sidebarCollapsed && <span>New Bill</span>}
        </motion.button>
      </div>

      {/* User Info card */}
      {isAuthenticated && user && (
        <div className={cn("px-3 mb-4", sidebarCollapsed && "px-2")}>
          <div className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl bg-slate-950/40 border border-slate-900",
            sidebarCollapsed ? "justify-center p-2" : ""
          )}>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-500/30">
              {user.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-200 truncate">{user.name || 'User'}</p>
                <span className="inline-block text-[8px] text-indigo-400 font-extrabold bg-indigo-950/50 px-1.5 py-0.5 rounded uppercase tracking-widest mt-0.5 border border-indigo-900/40">
                  {user.tier || 'free'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer controls & Collapse Toggle */}
      <div className="mt-auto border-t border-slate-900 pt-4 px-3 space-y-1">
        <button 
          onClick={onHelpOpen}
          aria-label="Help Center"
          title={sidebarCollapsed ? "Help Center" : undefined}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 rounded-xl transition-all cursor-pointer border-none outline-none",
            sidebarCollapsed && "justify-center"
          )}
        >
          <Icon name="help" className="text-lg" />
          {!sidebarCollapsed && <span className="text-sm">Help Center</span>}
        </button>

        {isAuthenticated ? (
          <button 
            onClick={logout}
            title={sidebarCollapsed ? "Logout" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-950/10 rounded-xl transition-all cursor-pointer border-none outline-none",
              sidebarCollapsed && "justify-center"
            )}
          >
            <Icon name="logout" className="text-lg" />
            {!sidebarCollapsed && <span>Logout</span>}
          </button>
        ) : (
          <Link 
            to="/login"
            title={sidebarCollapsed ? "Sign In" : undefined}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/30 rounded-xl transition-all cursor-pointer no-underline border-none outline-none",
              sidebarCollapsed && "justify-center"
            )}
          >
            <Icon name="login" className="text-lg" />
            {!sidebarCollapsed && <span>Sign In</span>}
          </Link>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={() => updateUI({ sidebarCollapsed: !sidebarCollapsed })}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 rounded-xl transition-all cursor-pointer border-none outline-none mt-2",
            sidebarCollapsed && "justify-center"
          )}
        >
          <Icon 
            name={sidebarCollapsed ? "keyboard_double_arrow_right" : "keyboard_double_arrow_left"} 
            className="text-lg" 
          />
          {!sidebarCollapsed && <span className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Collapse</span>}
        </button>
      </div>
    </aside>
  );
});

export default SideNavBar;
