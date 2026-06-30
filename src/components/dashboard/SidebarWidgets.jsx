import { motion } from 'framer-motion';
import Icon from '../Icon';


/* ponytail: no Groups feature - removed RecentGroups */

function UpcomingSettlements({ bills }) {
  const pending = (bills || []).filter(b => b.status === 'pending' && (b.receivable > 0 || b.payable > 0));

  return (
    <div className="rounded-3xl bg-white/60 dark:bg-[#12152a]/60 backdrop-blur-xl border border-white/30 dark:border-white/5 shadow-glass p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-6 rounded-full bg-emerald-500" />
          <h3 className="text-sm font-bold text-[--text-primary]">Upcoming Settlements</h3>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/20">{pending.length}</span>
      </div>
      <div className="space-y-3">
        {pending.length > 0 ? pending.slice(0, 5).map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-white/40 dark:bg-[#1a1d3a]/40 hover:bg-white/60 dark:hover:bg-[#1a1d3a]/60 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 flex items-center justify-center text-sm font-bold text-emerald-500 shrink-0">
              <Icon name="payments" className="text-lg" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[--text-primary] truncate">{b.title}</p>
              <p className="text-[11px] text-tertiary truncate">
                {b.receivable > 0 ? `You receive Rp ${b.receivable.toLocaleString('id-ID')}` : `You pay Rp ${b.payable.toLocaleString('id-ID')}`}
              </p>
            </div>
            <p className={"text-sm font-bold tabular-nums shrink-0 " + (b.receivable > 0 ? "text-emerald-500" : "text-red-500")}>
              {b.receivable > 0 ? '+' : '-'}Rp {(b.receivable || b.payable).toLocaleString('id-ID')}
            </p>
          </motion.div>
        )) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
              <Icon name="check_circle" className="text-2xl text-emerald-500" />
            </div>
            <p className="text-sm font-semibold text-[--text-primary] mb-1">All settled up!</p>
            <p className="text-xs text-tertiary">No outstanding payments</p>
          </div>
        )}
      </div>
    </div>
  );
}

function FriendsBalanceSummary({ bills }) {
  const totalReceivable = (bills || []).reduce((s, b) => s + (b.receivable || 0), 0);
  const totalPayable = (bills || []).reduce((s, b) => s + (b.payable || 0), 0);

  /* ponytail: bills don't carry debtor/creditor names in summary, show totals only */

  return (
    <div className="rounded-3xl bg-white/60 dark:bg-[#12152a]/60 backdrop-blur-xl border border-white/30 dark:border-white/5 shadow-glass p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-6 rounded-full bg-[--brand-primary]" />
        <h3 className="text-sm font-bold text-[--text-primary]">Balance Summary</h3>
      </div>
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">You are owed</p>
          {totalReceivable > 0 ? (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[--text-primary]">Outstanding receivable</span>
              <span className="text-sm font-bold text-emerald-500">+Rp {totalReceivable.toLocaleString('id-ID')}</span>
            </div>
          ) : (
            <p className="text-xs text-tertiary py-2">No one owes you</p>
          )}
        </div>
        <div className="border-t border-[--border] pt-3">
          <p className="text-xs font-semibold text-tertiary uppercase tracking-wider mb-2">You owe</p>
          {totalPayable > 0 ? (
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[--text-primary]">Outstanding payable</span>
              <span className="text-sm font-bold text-red-500">-Rp {totalPayable.toLocaleString('id-ID')}</span>
            </div>
          ) : (
            <p className="text-xs text-tertiary py-2">You don't owe anything</p>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpenseBreakdownChart({ bills }) {
  const spendingMap = {};
  bills.forEach(b => {
    const catNames = ['Food & Dining', 'Transport', 'Shopping', 'Entertainment', 'Utilities'];
    const idx = b.id?.charCodeAt(0) || 0;
    const cat = catNames[idx % catNames.length];
    spendingMap[cat] = (spendingMap[cat] || 0) + (b.grandTotal || 0);
  });

  const categoryColors = { 'Food & Dining': '#5B4CFD', 'Transport': '#22C55E', 'Shopping': '#F59E0B', 'Entertainment': '#EF4444', 'Utilities': '#8B5CF6' };
  const categories = Object.entries(spendingMap).map(([name, value]) => ({ name, color: categoryColors[name] || '#6366F1', value }));

  const total = categories.reduce((s, c) => s + c.value, 0) || 1;
  let cumulative = 0;
  const segments = categories.filter(c => c.value > 0).map(c => {
    const start = cumulative;
    cumulative += (c.value / total) * 360;
    return { ...c, percentage: ((c.value / total) * 100).toFixed(0), startAngle: start, endAngle: cumulative };
  });

  const cx = 80, cy = 80, r = 60;
  const polarToCart = (angle, radius) => ({
    x: cx + radius * Math.cos((angle - 90) * Math.PI / 180),
    y: cy + radius * Math.sin((angle - 90) * Math.PI / 180),
  });

  return (
    <div className="rounded-3xl bg-white/60 dark:bg-[#12152a]/60 backdrop-blur-xl border border-white/30 dark:border-white/5 shadow-glass p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-6 rounded-full bg-[--brand-primary]" />
        <h3 className="text-sm font-bold text-[--text-primary]">Spending Breakdown</h3>
      </div>
      <div className="flex items-center gap-6">
        <svg width="160" height="160" viewBox="0 0 160 160" aria-label="Expense breakdown pie chart">
          {segments.length > 0 ? segments.map((s, i) => {
            const start = polarToCart(s.startAngle, r);
            const end = polarToCart(s.endAngle, r);
            const large = s.endAngle - s.startAngle > 180 ? 1 : 0;
            return (
              <motion.path
                key={i}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                d={`M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y} Z`}
                fill={s.color}
                opacity="0.85"
                className="hover:opacity-100 transition-opacity"
              />
            );
          }) : (
            <circle cx={cx} cy={cy} r={r} fill="var(--border)" opacity="0.3" />
          )}
          <circle cx={cx} cy={cy} r="28" fill="var(--card-bg)" />
          <text x={cx} y={cy - 4} textAnchor="middle" className="text-xs font-bold" fill="var(--text-primary)" fontSize="12">
            {segments.length}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" className="text-[9px]" fill="var(--text-tertiary)" fontSize="9">
            categories
          </text>
        </svg>
        <div className="flex-1 space-y-2">
          {segments.map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded" style={{ background: s.color }} />
                <span className="text-xs text-[--text-primary]">{s.name}</span>
              </div>
              <span className="text-xs font-semibold text-tertiary">{s.percentage}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { UpcomingSettlements, FriendsBalanceSummary, ExpenseBreakdownChart };
