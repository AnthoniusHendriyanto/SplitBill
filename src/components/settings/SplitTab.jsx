import { motion } from 'framer-motion';
import Icon from '../Icon';
import { cn } from '../../utils/cn';

export default function SplitTab({ settings, updateSettings }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2 mb-1">
          <Icon name="call_split" className="text-indigo-400 text-base" />
          Split Preferences
        </h3>
        <p className="text-[10px] text-slate-500 font-semibold">Establish calculation rules for tax, auto-save drafts, and default strategies.</p>
      </div>
      <div className="space-y-4 p-4 bg-slate-950/30 border border-slate-950 rounded-xl font-semibold text-xs divide-y divide-slate-950">
        {[
          { label: 'Default Split Strategy', desc: 'Default strategy loaded at the start of step 4.', value: settings.defaultSplitMode || 'equal', key: 'defaultSplitMode', options: [
            { v: 'equal', l: 'Equal Split' }, { v: 'item', l: 'Itemized Checklist Grid' }, { v: 'percent', l: 'Percentage Sliders' }, { v: 'custom', l: 'Custom Amounts' },
          ]},
          { label: 'Tax Allocation Rule', desc: 'Determine how Tax / PB1 is distributed to participants.', value: settings.taxAllocation || 'proportionate', key: 'taxAllocation', options: [
            { v: 'proportionate', l: 'Proportionate to subtotal (Recommended)' }, { v: 'even', l: 'Divided equally among all members' },
          ]},
          { label: 'Service Charge Handling', desc: 'Determine how service charges are split.', value: settings.serviceChargeHandling || 'proportionate', key: 'serviceChargeHandling', options: [
            { v: 'proportionate', l: 'Proportionate to subtotal (Recommended)' }, { v: 'even', l: 'Divided equally among all members' },
          ]},
        ].map((s) => (
          <div key={s.key} className="flex items-center justify-between py-4 first:pb-4 first:pt-0 last:pt-4">
            <div>
              <p className="font-bold text-white">{s.label}</p>
              <p className="text-[10px] text-slate-500">{s.desc}</p>
            </div>
            <select value={s.value} onChange={(e) => updateSettings({ [s.key]: e.target.value })}
              className="bg-slate-950 border border-slate-900 rounded-lg px-3 py-1.5 text-xs font-bold outline-none cursor-pointer text-slate-200"
            >
              {s.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
        ))}
        <div className="flex items-center justify-between pt-4">
          <div>
            <p className="font-bold text-white">AI OCR Auto-Scan</p>
            <p className="text-[10px] text-slate-500">Instantly trigger AI scanner on uploading image receipts.</p>
          </div>
          <div role="switch" tabIndex={0} aria-checked={settings.autoScan}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateSettings({ autoScan: !settings.autoScan }); } }}
            onClick={() => updateSettings({ autoScan: !settings.autoScan })}
            className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300", settings.autoScan ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")}
          >
            <motion.div layout animate={{ x: settings.autoScan ? 28 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
