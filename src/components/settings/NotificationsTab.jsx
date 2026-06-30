import ToggleSwitch from '../ToggleSwitch';

export default function NotificationsTab({ settings, updateSettings }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-[--text-primary] mb-1">Notifications</h3>
        <p className="text-sm text-tertiary mb-6">Control how and when you receive updates.</p>
      </div>

      <div className="space-y-1 rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
        {[
          { label: 'Settlement Reminders', desc: 'Get notified when someone settles a bill.', key: 'settlementReminders', defaultVal: true },
          { label: 'Payment Due Alerts', desc: 'Receive alerts when payments are due.', key: 'paymentDueAlerts', defaultVal: true },
          { label: 'Weekly Digest', desc: 'Weekly summary of your spending and balances.', key: 'emailNotifications', defaultVal: true },
        ].map((n) => {
          const isOn = settings[n.key] === undefined ? n.defaultVal : settings[n.key];
          return (
            <div key={n.key} className="flex items-center justify-between px-5 py-4" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <div>
                <p className="text-sm font-medium text-[--text-primary]">{n.label}</p>
                <p className="text-xs text-tertiary mt-0.5">{n.desc}</p>
              </div>
              <ToggleSwitch isOn={isOn} onChange={() => updateSettings({ [n.key]: !isOn })} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
