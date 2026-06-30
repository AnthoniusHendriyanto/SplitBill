import { motion } from 'framer-motion';
import Icon from '../Icon';

export default function AccountTab({ profileForm, setProfileForm }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2 mb-1">
          <Icon name="person" className="text-indigo-400 text-base" />
          Account Information
        </h3>
        <p className="text-[10px] text-tertiary font-semibold">Update your profile parameters, phone numbers, and default locale.</p>
      </div>
      <div className="p-4 bg-surface-base/40 border border rounded-xl flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-indigo-950/40 border border-indigo-900/30 flex items-center justify-center text-xl font-black text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.1)] flex-shrink-0">
          {profileForm.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
        </div>
        <div>
          <span className="text-[9px] font-bold text-tertiary uppercase tracking-widest block mb-1">Profile Photo</span>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-surface-elevated hover:bg-surface-raised text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all border-none outline-none cursor-pointer">Upload Photo</button>
            <button className="px-3 py-1.5 bg-transparent hover:bg-surface-base text-tertiary font-extrabold text-[9px] uppercase tracking-wider rounded-lg transition-all border border cursor-pointer">Remove</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { id: 'acc-name', label: 'Display Name', value: profileForm.name, onChange: (v) => setProfileForm({ ...profileForm, name: v }), placeholder: 'e.g. Anton Wijaya' },
          { id: 'acc-email', label: 'Email Address', value: profileForm.email, onChange: (v) => setProfileForm({ ...profileForm, email: v }), placeholder: 'e.g. anton.wijaya@splitmate.id' },
        ].map((f) => (
          <div key={f.label} className="relative group">
            <label htmlFor={f.id} className="absolute -top-2 left-3 px-1 bg-card text-[9px] font-bold text-indigo-400 uppercase tracking-widest z-10">{f.label}</label>
            <input id={f.id} value={f.value} onChange={(e) => f.onChange(e.target.value)}
              className="w-full px-4 py-3 bg-surface-base/40 border border rounded-xl focus:border-indigo-500 outline-none text-xs font-bold text-white transition-all placeholder-slate-700" placeholder={f.placeholder}
            />
          </div>
        ))}
        <div className="relative group">
          <label htmlFor="acc-phone" className="absolute -top-2 left-3 px-1 bg-card text-[9px] font-bold text-indigo-400 uppercase tracking-widest z-10">WhatsApp / Phone</label>
          <input id="acc-phone" value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
            className="w-full px-4 py-3 bg-surface-base/40 border border rounded-xl focus:border-indigo-500 outline-none text-xs font-bold text-white transition-all placeholder-slate-700" placeholder="e.g. +62 812-3456-7890"
          />
        </div>
        <div className="relative group">
          <label htmlFor="acc-timezone" className="absolute -top-2 left-3 px-1 bg-card text-[9px] font-bold text-indigo-400 uppercase tracking-widest z-10">System Timezone</label>
          <select id="acc-timezone" value={profileForm.timezone} onChange={(e) => setProfileForm({ ...profileForm, timezone: e.target.value })}
            className="w-full px-4 py-3.5 bg-surface-base/40 border border rounded-xl focus:border-indigo-500 outline-none text-xs font-bold text-white transition-all cursor-pointer"
          >
            <option value="Asia/Jakarta (GMT+7)">Asia/Jakarta (GMT+7)</option>
            <option value="Asia/Singapore (GMT+8)">Asia/Singapore (GMT+8)</option>
            <option value="Europe/London (GMT+0)">Europe/London (GMT+0)</option>
            <option value="America/New_York (GMT-5)">America/New_York (GMT-5)</option>
          </select>
        </div>
        <div className="relative group">
          <label htmlFor="acc-language" className="absolute -top-2 left-3 px-1 bg-card text-[9px] font-bold text-indigo-400 uppercase tracking-widest z-10">System Language</label>
          <select id="acc-language" value={profileForm.language} onChange={(e) => setProfileForm({ ...profileForm, language: e.target.value })}
            className="w-full px-4 py-3.5 bg-surface-base/40 border border rounded-xl focus:border-indigo-500 outline-none text-xs font-bold text-white transition-all cursor-pointer"
          >
            <option value="English">English</option>
            <option value="Bahasa Indonesia">Bahasa Indonesia</option>
            <option value="Español">Español</option>
            <option value="Français">Français</option>
          </select>
        </div>
      </div>
    </motion.div>
  );
}
