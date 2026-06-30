import { motion } from 'framer-motion';
import Icon from '../Icon';

const actions = [
  { id: 'newBill', icon: 'add', label: 'New Bill', desc: 'Create a new split', action: 'bills', step: 1 },
  { id: 'scan', icon: 'document_scanner', label: 'Scan Receipt', desc: 'OCR auto-detect', action: 'bills', step: 1 },
];

export default function QuickActions({ onAction }) {
  return (
    <div className="rounded-3xl bg-surface-elevated/60 backdrop-blur-xl border border-white/[0.04] shadow-glass p-5">
      <div className="flex items-center gap-3 mb-4">
        <span className="w-1 h-5 rounded-full bg-brand-primary" />
        <h2 className="text-sm font-bold text-primary">Quick Actions</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction?.(a.action, a.step)}
            className="group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/[0.04] hover:border-brand-primary/30 p-4 text-left cursor-pointer outline-none transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl" />
            <div className="relative z-10">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-indigo-500 flex items-center justify-center text-white mb-3 shadow-lg">
                <Icon name={a.icon} className="text-lg" />
              </div>
              <p className="text-sm font-bold text-primary mb-0.5">{a.label}</p>
              <p className="text-[11px] text-tertiary">{a.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
