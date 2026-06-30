import ToggleSwitch from '../ToggleSwitch';

const selectClass = "h-12 px-4 rounded-2xl text-sm font-medium text-[--text-primary] outline-none transition-all duration-200 cursor-pointer";

export default function SplitTab({ settings, updateSettings }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-[--text-primary] mb-1">Split Rules</h3>
        <p className="text-sm text-tertiary mb-6">Default calculation rules for bill splitting.</p>
      </div>

      <div className="space-y-1 rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
        {[
          { label: 'Default Split Strategy', desc: 'Default strategy when creating a new bill.', value: settings.defaultSplitMode || 'equal', key: 'defaultSplitMode', options: [
            { v: 'equal', l: 'Equal Split' }, { v: 'item', l: 'Itemized' }, { v: 'percent', l: 'Percentage' }, { v: 'custom', l: 'Custom Amounts' },
          ]},
          { label: 'Tax Allocation', desc: 'How tax is distributed to participants.', value: settings.taxAllocation || 'proportionate', key: 'taxAllocation', options: [
            { v: 'proportionate', l: 'Proportionate to subtotal' }, { v: 'even', l: 'Divided equally' },
          ]},
          { label: 'Service Charge', desc: 'How service charges are split.', value: settings.serviceChargeHandling || 'proportionate', key: 'serviceChargeHandling', options: [
            { v: 'proportionate', l: 'Proportionate to subtotal' }, { v: 'even', l: 'Divided equally' },
          ]},
        ].map((s) => (
          <div key={s.key} className="flex items-center justify-between px-5 py-4" style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <div className="flex-1 mr-4">
              <p className="text-sm font-medium text-[--text-primary]">{s.label}</p>
              <p className="text-xs text-tertiary mt-0.5">{s.desc}</p>
            </div>
            <select className={selectClass} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', maxWidth: '200px' }}
              value={s.value} onChange={(e) => updateSettings({ [s.key]: e.target.value })}>
              {s.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div>
            <p className="text-sm font-medium text-[--text-primary]">Auto-Scan</p>
            <p className="text-xs text-tertiary mt-0.5">Automatically scan receipts on upload.</p>
          </div>
          <ToggleSwitch isOn={settings.autoScan} onChange={() => updateSettings({ autoScan: !settings.autoScan })} />
        </div>
      </div>
    </div>
  );
}
