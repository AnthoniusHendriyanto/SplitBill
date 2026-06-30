import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';
import Icon from '../Icon';

function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  const w = 72, h = 28;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  const fillPoints = `0,${h} ${points} ${w},${h}`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="flex-shrink-0" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={fillPoints} fill={`${color}12`} />
    </svg>
  );
}

const variantStyles = {
  receivable: { icon: 'currency_exchange', bg: 'bg-emerald-500/10', iconColor: 'text-emerald-500', trendUp: true, label: 'Total Receivable' },
  payable: { icon: 'arrow_upward', bg: 'bg-red-500/10', iconColor: 'text-red-500', trendUp: false, label: 'Total Payable' },
  pending: { icon: 'pending_actions', bg: 'bg-amber-500/10', iconColor: 'text-amber-500', trendUp: false, label: 'Pending Settlements' },
  spending: { icon: 'account_balance_wallet', bg: 'bg-violet-500/10', iconColor: 'text-violet-500', trendUp: true, label: 'Monthly Spending' },
};

export default function MetricCard({ type, value, trend, sparklineData }) {
  const s = variantStyles[type] || variantStyles.spending;
  const trendColor = trend >= 0 ? 'text-emerald-500' : 'text-red-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl bg-white/70 dark:bg-[#12152a]/70 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-glass hover:shadow-card-hover transition-all duration-300 group"
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", s.bg)}>
            <Icon name={s.icon} className={cn("text-xl", s.iconColor)} />
          </div>
          <Sparkline data={sparklineData} color={trend >= 0 ? '#22C55E' : '#EF4444'} trend={trend} />
        </div>
        <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-1">{s.label}</p>
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
      <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none", s.bg)} style={{ maskImage: 'linear-gradient(to bottom, transparent 40%, black 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 40%, black 100%)' }} />
    </motion.div>
  );
}
