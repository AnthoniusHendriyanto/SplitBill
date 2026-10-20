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
  completed: 'bg-[--brand-primary-subtle] text-[--brand-primary] border-[--brand-primary]/20',
  pending: 'bg-[--semantic-warning-bg] text-warning border-border',
  draft: 'bg-surface-raised text-secondary border-border',
};

function ActivityItem({ item, index, onSelect }) {
  const payerName = item.payerName || 'Someone';
  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      type="button"
      onClick={() => onSelect?.(item.id)}
      className="w-full text-left flex items-center gap-3 sm:gap-5 py-5 px-4 sm:px-6 border-b border-border last:border-0 hover:bg-surface-raised transition-colors cursor-pointer group"
    >
      <div className="w-11 h-11 rounded-xl bg-surface-raised border border-border flex items-center justify-center text-primary shrink-0">
        <Icon name="receipt_long" className="text-xl" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[--text-primary] truncate">
          {item.title || 'Untitled bill'}
        </p>
        <p className="text-xs text-secondary mt-1 truncate">{payerName} paid · {getRelativeTime(item.completedAt)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-bold tabular-nums text-[--text-primary]">Rp {(item.grandTotal || 0).toLocaleString('id-ID')}</p>
        <span className={cn(
          "inline-block text-xs font-semibold px-2 py-0.5 rounded-full border mt-1",
          statusColors[item.status] || statusColors.pending
        )}>
          {item.status === 'completed' ? 'Settled' : item.status === 'draft' ? 'Draft' : 'Pending'}
        </span>
      </div>
    </motion.button>
  );
}

function LoadingSkeleton() {
  return (
    <div role="status" className="space-y-3" aria-busy="true" aria-label="Loading activities">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-surface-elevated animate-pulse">
          <div className="w-10 h-10 rounded-full bg-[--border]" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-full max-w-48 bg-[--border] rounded" />
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

function EmptyState({ onNewBill, searching }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[--brand-primary-subtle] border border-[--brand-primary]/20 flex items-center justify-center mb-3 text-[--brand-primary]">
        <Icon name="receipt_long" className="text-xl" />
      </div>
      <p className="text-lg font-bold text-primary mb-2">{searching ? 'No matching splits' : 'Your next memory starts here.'}</p>
      <p className="text-sm text-secondary max-w-xs leading-relaxed">{searching ? 'Try a different merchant, title or date.' : 'Your saved bills and shared moments will show up here.'}</p>
      {!searching && onNewBill && <button className="btn-secondary mt-5" onClick={onNewBill}>New Split <Icon name="arrow_forward" className="text-base" /></button>}
    </div>
  );
}

export default memo(function ActivityFeed({ bills, isLoading, error, onSelectBill, onNewBill, searching = false }) {
  return (
    <div className="panel overflow-hidden">

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
            {bills.map((item, i) => (
              <ActivityItem key={item.id} item={item} index={i} onSelect={onSelectBill} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <EmptyState onNewBill={onNewBill} searching={searching} />
      )}
    </div>
  );
});
