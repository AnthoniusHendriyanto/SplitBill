import { motion } from 'framer-motion';
import Icon from '../Icon';
import { cn } from '../../utils/cn';

export default function PreferencesTab({ settings, updateSettings }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2 mb-1">
          <Icon name="tune" className="text-indigo-400 text-base" />
          Application Preferences
        </h3>
        <p className="text-[10px] text-slate-500 font-semibold">Tweak structural visual metrics, currency overlays, and animations preferences.</p>
      </div>
      <div className="space-y-4 p-4 bg-slate-950/30 border border-slate-950 rounded-xl font-semibold text-xs divide-y divide-slate-950">
        <div className="flex items-center justify-between pb-4">
          <div>
            <p className="font-bold text-white">Dark Mode</p>
            <p className="text-[10px] text-slate-500">Enable dark mode for reduced eye strain in low light.</p>
          </div>
          <div role="switch" tabIndex={0} aria-checked={settings.darkMode}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const v = !settings.darkMode; updateSettings({ darkMode: v }); document.documentElement.classList.toggle('dark', v); } }}
            onClick={() => { const v = !settings.darkMode; updateSettings({ darkMode: v }); document.documentElement.classList.toggle('dark', v); }}
            className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300", settings.darkMode ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")}
          >
            <motion.div layout animate={{ x: settings.darkMode ? 28 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="font-bold text-white">Animations</p>
            <p className="text-[10px] text-slate-500">Enable fluid spring animations and micro-interactions.</p>
          </div>
          <div role="switch" tabIndex={0} aria-checked={settings.animations}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateSettings({ animations: !settings.animations }); } }}
            onClick={() => updateSettings({ animations: !settings.animations })}
            className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300", settings.animations ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")}
          >
            <motion.div layout animate={{ x: settings.animations ? 28 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between py-4">
          <div>
            <p className="font-bold text-white">Round Numbers</p>
            <p className="text-[10px] text-slate-500">Automatically round fractions for neat balances.</p>
          </div>
          <div role="switch" tabIndex={0} aria-checked={settings.roundNumbers}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateSettings({ roundNumbers: !settings.roundNumbers }); } }}
            onClick={() => updateSettings({ roundNumbers: !settings.roundNumbers })}
            className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300", settings.roundNumbers ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")}
          >
            <motion.div layout animate={{ x: settings.roundNumbers ? 28 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
          </div>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="font-bold text-white">Primary Currency Display</p>
            <p className="text-[10px] text-slate-500">Preferred standard currency format across all ledgers.</p>
          </div>
          <select value={settings.currency || 'IDR'} onChange={(e) => updateSettings({ currency: e.target.value })}
            className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold outline-none ring-indigo-500/20 cursor-pointer text-slate-200"
          >
            <option value="IDR">IDR (Rp)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="SGD">SGD ($)</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
}
