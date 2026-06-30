import { motion } from 'framer-motion';
import Icon from '../Icon';
import { cn } from '../../utils/cn';

export default function SecurityTab({ securityForm, setSecurityForm, handleUpdatePassword, handleRevokeSession, sessions }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2 mb-1">
          <Icon name="shield" className="text-indigo-400 text-base" />
          Security Settings
        </h3>
        <p className="text-[10px] text-tertiary font-semibold">Tweak password locks, activate two-factor authentication, and monitor active sessions.</p>
      </div>
      <div className="p-5 bg-surface-base/20 border border rounded-2xl space-y-5">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest block">Change Profile Password</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {['Current Password', 'New Password', 'Confirm Password'].map((label) => {
            const fieldId = `sec-${label.toLowerCase().replace(/\s+/g, '-')}`;
            return (
            <div key={label} className="relative group">
              <label htmlFor={fieldId} className="absolute -top-2 left-3 px-1 bg-card text-[9px] font-bold text-indigo-400 uppercase tracking-widest z-10">{label}</label>
              <input id={fieldId} type="password" value={securityForm[label.toLowerCase().replace(/\s+/g, '')]}
                onChange={(e) => setSecurityForm({ ...securityForm, [label.toLowerCase().replace(/\s+/g, '')]: e.target.value })}
                className="w-full px-4 py-3 bg-surface-base/40 border border rounded-xl focus:border-indigo-500 outline-none text-xs font-bold text-white transition-all"
              />
            </div>
            );
          })}
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleUpdatePassword}
            className="px-4 py-2 bg-surface-elevated hover:bg-surface-raised text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all border border-strong cursor-pointer outline-none"
          >
            Update Password
          </button>
        </div>
      </div>
      <div className="p-5 bg-surface-base/20 border border rounded-2xl flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-white">Two-Factor Authentication (2FA)</p>
          <p className="text-[10px] text-tertiary">Protect account credentials with standard verification codes.</p>
        </div>
        <div onClick={() => setSecurityForm({ ...securityForm, twoFactorEnabled: !securityForm.twoFactorEnabled })}
          className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300", securityForm.twoFactorEnabled ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")}
        >
          <motion.div layout animate={{ x: securityForm.twoFactorEnabled ? 28 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
        </div>
      </div>
      <div className="p-5 bg-surface-base/20 border border rounded-2xl space-y-4">
        <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest block">Active Session Devices</span>
        {sessions.length > 0 ? (
          <div className="divide-y divide-border space-y-3 font-semibold text-xs">
            {sessions.map((s) => (
              <div key={s.id} className="flex justify-between items-center pt-3 first:pt-0">
                <div className="flex gap-3 items-start">
                  <Icon name={s.device.includes('iPhone') ? 'phone_iphone' : 'laptop_mac'} className="text-tertiary text-lg mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-white font-bold flex items-center gap-1.5">
                      {s.device}
                      {s.active && <span className="text-[7px] font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-1.5 py-0.5 rounded uppercase tracking-wider">Current</span>}
                    </p>
                    <p className="text-[9px] text-tertiary mt-0.5">{s.location} • IP: {s.ip}</p>
                  </div>
                </div>
                {!s.active && (
                  <button onClick={() => handleRevokeSession(s.id)}
                    className="px-2.5 py-1 text-[9px] font-bold text-red-400 hover:text-red-300 bg-red-950/10 hover:bg-red-950/30 border border-red-900/30 rounded transition-all cursor-pointer outline-none"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-tertiary font-semibold italic text-center py-4">No active devices monitored.</p>
        )}
      </div>
    </motion.div>
  );
}
