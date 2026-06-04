import { motion } from 'framer-motion';
import Icon from '../Icon';
import { cn } from '../../utils/cn';

export default function NotificationsTab({ settings, updateSettings }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2 mb-1">
          <Icon name="notifications_none" className="text-indigo-400 text-base" />
          Notifications Rules
        </h3>
        <p className="text-[10px] text-slate-500 font-semibold">Control direct channel outputs for reminders and settle requests.</p>
      </div>
      <div className="space-y-4 p-4 bg-slate-950/30 border border-slate-950 rounded-xl font-semibold text-xs divide-y divide-slate-950">
        {[
          { label: 'WhatsApp Settle Reminders', desc: 'Allow generating single-click direct WhatsApp text instructions.', key: 'whatsappReminders', defaultVal: true },
          { label: 'Active Settlement Reminders', desc: 'Receive in-app alerts when a participant settles their outstanding share.', key: 'settlementReminders', defaultVal: true },
          { label: 'Payment Due Alerts', desc: 'Receive notifications when outbound splits approach set deadlines.', key: 'paymentDueAlerts', defaultVal: true },
          { label: 'Weekly Digest Reports', desc: 'Get rich summaries of split flows, balances, and savings via email.', key: 'emailNotifications', defaultVal: true },
        ].map((n) => {
          const isOn = settings[n.key] === undefined ? n.defaultVal : settings[n.key];
          return (
            <div key={n.key} className="flex items-center justify-between py-4 first:pb-4 first:pt-0 last:pt-4">
              <div>
                <p className="font-bold text-white">{n.label}</p>
                <p className="text-[10px] text-slate-500">{n.desc}</p>
              </div>
              <div role="switch" tabIndex={0} aria-checked={isOn}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); updateSettings({ [n.key]: !isOn }); } }}
                onClick={() => updateSettings({ [n.key]: !isOn })}
                className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300", isOn ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")}
              >
                <motion.div layout animate={{ x: isOn ? 28 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
