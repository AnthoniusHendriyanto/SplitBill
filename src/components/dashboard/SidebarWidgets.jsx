import { motion } from 'framer-motion';
import Icon from '../Icon';

function UpcomingSettlements({ bills }) {
  const pending = (bills || []).filter(b => b.status === 'pending' && (b.receivable > 0 || b.payable > 0));

  return (
    <div className="rounded-2xl bg-[--surface-elevated] border border-[--border] shadow-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[11px] font-medium text-[--text-tertiary] uppercase tracking-wider">Upcoming</h3>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[--semantic-warning-bg] text-[--semantic-warning] border border-[--semantic-warning]/20">{pending.length}</span>
      </div>
      <div className="space-y-3">
        {pending.length > 0 ? pending.slice(0, 5).map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-[--border] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[--brand-primary-subtle] flex items-center justify-center text-sm font-bold text-[--brand-primary] shrink-0">
              <Icon name="payments" className="text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[--text-primary] truncate">{b.title}</p>
              <p className="text-[11px] text-[--text-tertiary] truncate">
                {b.receivable > 0 ? `You receive Rp ${b.receivable.toLocaleString('id-ID')}` : `You pay Rp ${b.payable.toLocaleString('id-ID')}`}
              </p>
            </div>
            <p className={"text-xs font-bold tabular-nums shrink-0 " + (b.receivable > 0 ? "text-[--semantic-success]" : "text-[--semantic-error]")}>
              {b.receivable > 0 ? '+' : '-'}Rp {(b.receivable || b.payable).toLocaleString('id-ID')}
            </p>
          </motion.div>
        )) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Icon name="check_circle" className="text-2xl text-[--semantic-success] mb-2" />
            <p className="text-sm font-semibold text-[--text-primary]">All settled</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FriendsBalanceSummary({ bills }) {
  const totalReceivable = (bills || []).reduce((s, b) => s + (b.receivable || 0), 0);
  const totalPayable = (bills || []).reduce((s, b) => s + (b.payable || 0), 0);

  return (
    <div className="rounded-2xl bg-[--surface-elevated] border border-[--border] shadow-card p-5">
      <h3 className="text-[11px] font-medium text-[--text-tertiary] uppercase tracking-wider mb-4">Balance</h3>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[--text-secondary]">You are owed</span>
          <span className="text-xs font-bold text-[--semantic-success] tabular-nums">+Rp {totalReceivable.toLocaleString('id-ID')}</span>
        </div>
        <div className="border-t border-[--border] pt-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[--text-secondary]">You owe</span>
            <span className="text-xs font-bold text-[--semantic-error] tabular-nums">-Rp {totalPayable.toLocaleString('id-ID')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export { UpcomingSettlements, FriendsBalanceSummary };
