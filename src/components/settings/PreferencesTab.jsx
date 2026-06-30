import ToggleSwitch from '../ToggleSwitch';

const selectClass = "h-12 px-4 rounded-2xl text-sm font-medium text-[--text-primary] outline-none transition-all duration-200 cursor-pointer";

export default function PreferencesTab({ settings, updateSettings }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-[--text-primary] mb-1">Preferences</h3>
        <p className="text-sm text-tertiary mb-6">Application appearance and regional settings.</p>
      </div>

      <div className="space-y-1 rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between px-5 py-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <p className="text-sm font-medium text-[--text-primary]">Dark Mode</p>
            <p className="text-xs text-tertiary mt-0.5">Enable dark theme across the application.</p>
          </div>
          <ToggleSwitch isOn={settings.darkMode} onChange={() => updateSettings({ darkMode: !settings.darkMode })} />
        </div>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <p className="text-sm font-medium text-[--text-primary]">Round Numbers</p>
            <p className="text-xs text-tertiary mt-0.5">Automatically round split amounts for neat balances.</p>
          </div>
          <ToggleSwitch isOn={settings.roundNumbers} onChange={() => updateSettings({ roundNumbers: !settings.roundNumbers })} />
        </div>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <p className="text-sm font-medium text-[--text-primary]">Currency</p>
            <p className="text-xs text-tertiary mt-0.5">Preferred currency format across all ledgers.</p>
          </div>
          <select className={selectClass} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            value={settings.currency || 'IDR'} onChange={(e) => updateSettings({ currency: e.target.value })}>
            <option value="IDR">IDR (Rp)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="SGD">SGD ($)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
