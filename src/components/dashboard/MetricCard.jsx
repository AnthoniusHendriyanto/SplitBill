import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import Icon from '../Icon';

const variantStyles = {
  receivable: { icon: 'currency_exchange', bg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', trendUp: true, label: 'Total Receivable' },
  payable: { icon: 'arrow_upward', bg: 'bg-red-500/10', iconColor: 'text-red-500', trendUp: false, label: 'Total Payable' },
  pending: { icon: 'pending_actions', bg: 'bg-amber-500/10', iconColor: 'text-amber-500', trendUp: false, label: 'Pending Settlements' },
  spending: { icon: 'receipt_long', bg: 'bg-gradient-to-br from-violet-500/20 to-indigo-500/20', iconColor: 'text-indigo-400', trendUp: true, label: 'Monthly Spending' },
};

export default function MetricCard({ type, value, trend, subtitle, headerRight, className }) {
  const s = variantStyles[type] || variantStyles.spending;
  const trendColor = trend >= 0 ? 'text-emerald-500' : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("relative overflow-hidden rounded-3xl bg-white/70 dark:bg-[#12152a]/70 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-glass hover:shadow-card-hover transition-all duration-300 group", className)}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", s.bg)}>
            <Icon name={s.icon} className={cn("text-xl", s.iconColor)} />
          </div>
          {headerRight}
        </div>
        <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-1">{subtitle || s.label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-[--text-primary] tabular-nums">{value}</span>
          {trend !== undefined && (
            <span className={cn("text-xs font-semibold flex items-center gap-0.5", trendColor)}>
              <Icon name={trend >= 0 ? 'trending_up' : 'trending_down'} className="text-sm" />
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none", type === 'spending' ? 'bg-gradient-to-br from-violet-500/5 to-indigo-500/5' : s.bg)} style={{ maskImage: 'linear-gradient(to bottom, transparent 40%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 40%, black 100%)' }} />
    </motion.div>
  );
}
