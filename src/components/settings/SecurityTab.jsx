import Icon from '../Icon';
import ToggleSwitch from '../ToggleSwitch';

const inputClass = "w-full h-12 px-4 rounded-2xl text-sm font-medium text-[--text-primary] outline-none transition-all duration-200 focus:ring-1 focus:ring-[--brand-primary] focus:ring-opacity-50";

export default function SecurityTab({ securityForm, setSecurityForm, handleUpdatePassword, handleRevokeSession, sessions }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-[--text-primary] mb-1">Security</h3>
        <p className="text-sm text-tertiary mb-6">Manage your password and active sessions.</p>
      </div>

      {/* Password */}
      <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
        <h4 className="text-sm font-semibold text-[--text-primary] mb-4">Change Password</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          {['Current Password', 'New Password', 'Confirm Password'].map((label) => {
            const key = label.toLowerCase().replace(/\s+/g, '');
            return (
              <div key={label}>
                <label className="text-xs font-medium text-tertiary mb-2 block">{label}</label>
                <input className={inputClass} type="password" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                  value={securityForm[key] || ''}
                  onChange={(e) => setSecurityForm({ ...securityForm, [key]: e.target.value })} />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end">
          <button onClick={handleUpdatePassword}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[--text-primary] transition-all cursor-pointer border-none outline-none"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            Update Password
          </button>
        </div>
      </div>

      {/* 2FA */}
      <div className="flex items-center justify-between p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
        <div>
          <p className="text-sm font-medium text-[--text-primary]">Two-Factor Authentication</p>
          <p className="text-xs text-tertiary mt-0.5">Add an extra layer of security to your account.</p>
        </div>
        <ToggleSwitch isOn={securityForm.twoFactorEnabled} onChange={() => setSecurityForm({ ...securityForm, twoFactorEnabled: !securityForm.twoFactorEnabled })} />
      </div>

      {/* Sessions */}
      <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
        <h4 className="text-sm font-semibold text-[--text-primary] mb-4">Active Sessions</h4>
        {sessions.length > 0 ? (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div className="flex items-center gap-3">
                  <Icon name={s.device.includes('iPhone') ? 'phone_iphone' : 'laptop_mac'} className="text-tertiary text-lg" />
                  <div>
                    <p className="text-sm font-medium text-[--text-primary] flex items-center gap-2">
                      {s.device}
                      {s.active && <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(34,197,94,0.1)', color: 'var(--semantic-success)' }}>Current</span>}
                    </p>
                    <p className="text-xs text-tertiary">{s.location} · {s.ip}</p>
                  </div>
                </div>
                {!s.active && (
                  <button onClick={() => handleRevokeSession(s.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer border-none outline-none"
                    style={{ color: 'var(--semantic-error)', background: 'rgba(239,68,68,0.08)' }}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-tertiary py-4 text-center">No active sessions.</p>
        )}
      </div>
    </div>
  );
}
