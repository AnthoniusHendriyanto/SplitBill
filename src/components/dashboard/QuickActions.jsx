import { motion } from 'framer-motion';
import Icon from '../Icon';

const actions = [
  { id: 'scan', icon: 'document_scanner', label: 'Scan Receipt', desc: 'OCR photo extraction', action: 'bills', step: 1 },
  { id: 'manual', icon: 'edit_note', label: 'Manual Entry', desc: 'Create ledger by hand', action: 'bills', step: 2 },
];

export default function QuickActions({ onAction }) {
  return (
    <div className="rounded-2xl bg-[--surface-elevated] border border-[--border] shadow-card p-5">
      <h2 className="text-[11px] font-medium text-tertiary uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAction?.(a.action, a.step)}
            className="group relative overflow-hidden rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-[--brand-primary]/30 p-4 text-left cursor-pointer outline-none transition-all duration-200"
          >
            <div className="relative z-10">
              <div className="w-8 h-8 rounded-lg bg-[--brand-primary-subtle] border border-[--brand-primary]/20 flex items-center justify-center text-[--brand-primary] mb-2.5">
                <Icon name={a.icon} className="text-base" />
              </div>
              <h3 className="text-xs font-bold text-primary mb-0.5 group-hover:text-[--brand-primary] transition-colors">{a.label}</h3>
              <p className="text-[10px] text-tertiary font-medium">{a.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
