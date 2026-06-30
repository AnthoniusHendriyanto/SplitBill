import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';
import Icon from '../Icon';

function getRelativeTime(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const statusColors = {
  completed: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
  pending: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
  draft: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/20',
};

function ActivityItem({ item, index, onSelect }) {
  const payerName = item.payerName || 'Someone';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(item.id)}
      onKeyDown={(e) => { if (e.key === 'Enter') onSelect?.(item.id); }}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white/50 dark:bg-[#12152a]/50 hover:bg-white/80 dark:hover:bg-[#1a1d3a]/80 border border-transparent hover:border-[--border] transition-all cursor-pointer group"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[--brand-primary] to-violet-600 flex items-center justify-center text-white text-sm font-bold shrink-0 ring-2 ring-[--brand-primary-glow]">
        {payerName.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          <span className="font-medium text-secondary">{payerName}</span> paid {item.title || 'a bill'}
        </p>
        <p className="text-xs text-tertiary mt-0.5">{getRelativeTime(item.completedAt)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold tabular-nums text-[--text-primary]">Rp {(item.grandTotal || 0).toLocaleString('id-ID')}</p>
        <span className={cn(
          "inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1 uppercase tracking-wide",
          statusColors[item.status] || statusColors.pending
        )}>
          {item.status || 'pending'}
        </span>
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading activities">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-white/30 dark:bg-[#12152a]/30 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[--border]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 bg-[--border] rounded" />
            <div className="h-3 w-24 bg-[--border] rounded" />
          </div>
          <div className="space-y-2 text-right">
            <div className="h-4 w-20 bg-[--border] rounded ml-auto" />
            <div className="h-3 w-14 bg-[--border] rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-3xl bg-[--brand-primary]/10 flex items-center justify-center mb-4">
        <Icon name="celebration" className="text-3xl text-[--brand-primary]" />
      </div>
      <p className="text-lg font-bold text-[--text-primary] mb-1">No activity yet 🎉</p>
      <p className="text-sm text-tertiary max-w-xs leading-relaxed">Create your first split bill to get started tracking expenses.</p>
    </div>
  );
}

export default memo(function ActivityFeed({ bills, isLoading, error, onSelectBill, onNewBill }) {
  return (
    <div className="rounded-3xl bg-white/60 dark:bg-[#12152a]/60 backdrop-blur-xl border border-white/30 dark:border-white/5 shadow-glass p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-[--brand-primary]" />
          <h2 className="text-base font-bold text-[--text-primary]">Activity Feed</h2>
        </div>
        <button onClick={onNewBill} className="text-xs font-semibold text-[--brand-primary] hover:text-[--brand-primary-hover] transition-colors cursor-pointer border-none outline-none bg-transparent">
          View all
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icon name="error_outline" className="text-3xl text-error mb-3" />
          <p className="text-sm font-semibold text-error mb-1">Failed to load</p>
          <p className="text-xs text-tertiary">{error}</p>
        </div>
      ) : bills.length > 0 ? (
        <div className="space-y-1">
          <AnimatePresence mode="popLayout">
            {bills.slice(0, 10).map((item, i) => (
              <ActivityItem key={item.id} item={item} index={i} onSelect={onSelectBill} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState />
      )}
    </div>
  );
});
