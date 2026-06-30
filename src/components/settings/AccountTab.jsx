const inputClass = "w-full h-12 px-4 rounded-2xl text-sm font-medium text-[--text-primary] placeholder-tertiary outline-none transition-all duration-200 focus:ring-1 focus:ring-[--brand-primary] focus:ring-opacity-50";
const labelClass = "text-xs font-medium text-tertiary mb-2 block";

export default function AccountTab({ profileForm, setProfileForm, onHasChanges }) {
  const set = (k, v) => { setProfileForm(p => ({ ...p, [k]: v })); onHasChanges(); };
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Profile section */}
      <div>
        <h3 className="text-lg font-bold text-[--text-primary] mb-1">Profile</h3>
        <p className="text-sm text-tertiary mb-6">Your personal information and contact details.</p>

        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0" style={{ background: 'var(--brand-primary)' }}>
            {profileForm.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-semibold text-[--text-primary]">{profileForm.name}</p>
            <p className="text-sm text-tertiary">{profileForm.email}</p>
            <p className="text-xs text-tertiary mt-0.5">Free plan</p>
          </div>
          <div className="ml-auto flex gap-2">
            <button className="px-4 py-2 rounded-xl text-xs font-medium text-[--text-primary] transition-all cursor-pointer border-none outline-none" style={{ background: 'rgba(255,255,255,0.06)' }}>
              Change photo
            </button>
            <button className="px-4 py-2 rounded-xl text-xs font-medium text-tertiary transition-all cursor-pointer border-none outline-none" style={{ background: 'rgba(255,255,255,0.04)' }}>
              Remove
            </button>
          </div>
        </div>
      </div>

      {/* Fields */}
      <div>
        <h4 className="text-sm font-semibold text-[--text-primary] mb-4">Personal Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className={labelClass}>Display Name</label>
            <input className={inputClass} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              value={profileForm.name} onChange={e => set('name', e.target.value)} placeholder="Your name" />
          </div>
          <div>
            <label className={labelClass}>Email Address</label>
            <input className={inputClass} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              value={profileForm.email} onChange={e => set('email', e.target.value)} placeholder="email@example.com" />
          </div>
          <div>
            <label className={labelClass}>Phone Number</label>
            <input className={inputClass} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              value={profileForm.phone} disabled aria-label="Coming soon" title="Not yet available"
              placeholder="+62 812-3456-7890" />
          </div>
          <div>
            <label className={labelClass}>Timezone</label>
            <select className={inputClass} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              value={profileForm.timezone} disabled aria-label="Coming soon" title="Not yet available">
              <option value="Asia/Jakarta (GMT+7)">Asia/Jakarta (GMT+7)</option>
              <option value="Asia/Singapore (GMT+8)">Asia/Singapore (GMT+8)</option>
              <option value="Europe/London (GMT+0)">Europe/London (GMT+0)</option>
              <option value="America/New_York (GMT-5)">America/New_York (GMT-5)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Language</label>
            <select className={inputClass} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              value={profileForm.language} disabled aria-label="Coming soon" title="Not yet available">
              <option value="English">English</option>
              <option value="Bahasa Indonesia">Bahasa Indonesia</option>
              <option value="Español">Español</option>
              <option value="Français">Français</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
