import { motion } from 'framer-motion';

export default function MonthlyTrendChart({ bills }) {
  const now = new Date();
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  // Create array of last 6 months (current month + 5 previous)
  const data = Array(6).fill().map((_, i) => {
    const m = (now.getMonth() - 5 + i + 12) % 12;
    const y = now.getFullYear() - (now.getMonth() - 5 + i < 0 ? 1 : 0);
    const monthLabel = monthNames[m];
    
    return {
      month: monthLabel,
      value: bills
        .filter(b => {
          const billDate = b.billDate ? new Date(b.billDate) : (b.completedAt ? new Date(b.completedAt) : null);
          return billDate && billDate.getMonth() === m && billDate.getFullYear() === y;
        })
        .reduce((s, b) => s + (b.user_share || 0) + (b.discount || 0), 0),
    };
  });

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const pad = 0.1;
  const w = 300, h = 140, chartW = w - 40, chartH = h - 40;

  return (
    <div className="rounded-3xl bg-white/60 dark:bg-[#12152a]/60 backdrop-blur-xl border border-white/30 dark:border-white/5 shadow-glass p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1.5 h-6 rounded-full bg-[--brand-primary]" />
        <h3 className="text-sm font-bold text-[--text-primary]">Spending Trend</h3>
      </div>
      <div className="overflow-x-auto">
        <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" aria-label="Monthly spending trend chart" className="w-full">
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((r, i) => (
            <line key={i} x1="30" y1={h - 20 - chartH * r} x2={w - 10} y2={h - 20 - chartH * r}
              stroke="var(--border)" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
          ))}
          {/* Line */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            d={`M ${data.map((d, i) => {
              const x = 30 + (i / (data.length - 1)) * chartW;
              const y = h - 20 - (d.value / maxVal) * chartH * (1 - pad * 2) - chartH * pad;
              return `${i === 0 ? '' : 'L'}${x},${y}`;
            }).join(' ')}`}
            fill="none" stroke="var(--brand-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          />
          {/* Area fill */}
          <motion.path
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            d={`M30,${h - 20} ${data.map((d, i) => {
              const x = 30 + (i / (data.length - 1)) * chartW;
              const y = h - 20 - (d.value / maxVal) * chartH * (1 - pad * 2) - chartH * pad;
              return `L${x},${y}`;
            }).join(' ')} L${30 + chartW},${h - 20} Z`}
            fill="url(#trendGradient)" opacity="0.15"
          />
          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--brand-primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Labels */}
          {data.map((d, i) => {
            const x = 30 + (i / (data.length - 1)) * chartW;
            return (
              <g key={i}>
                <text x={x} y={h - 5} textAnchor="middle" fill="var(--text-tertiary)" fontSize="9">{d.month}</text>
                {d.value > 0 && (
                  <text x={x} y={h - 20 - (d.value / maxVal) * chartH * (1 - pad * 2) - chartH * pad - 6}
                    textAnchor="middle" fill="var(--text-secondary)" fontSize="8">
                    Rp {(d.value / 1000).toFixed(0)}k
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
