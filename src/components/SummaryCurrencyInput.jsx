import { memo } from 'react';
import { cn } from '../utils/cn';

const SummaryCurrencyInput = memo(({ label, value, onChange, readOnly = false, suffix, className }) => {
  return (
    <div className={cn("flex justify-between items-center gap-4", className)}>
      <span className="text-[11px] font-medium text-tertiary shrink-0">{label}</span>
      <div className="flex items-center h-10 bg-black/20 border border-white/[0.06] rounded-xl px-3 transition-all focus-within:border-brand-primary/50 focus-within:shadow-[0_0_0_1px_var(--brand-primary)] min-w-[140px]">
        <span className="text-[10px] font-semibold text-tertiary mr-1.5 shrink-0">Rp</span>
        <input
          type="number"
          value={value ?? 0}
          onChange={(e) => {
            if (!readOnly) onChange(parseFloat(e.target.value) || 0);
          }}
          readOnly={readOnly}
          className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs font-semibold text-primary placeholder:text-tertiary/40 p-0 text-right appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
          placeholder="0"
        />
        {suffix && <span className="ml-1.5 shrink-0">{suffix}</span>}
      </div>
    </div>
  );
});

export default SummaryCurrencyInput;
