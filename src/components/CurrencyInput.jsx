import { memo, useRef, useCallback } from 'react';
import { cn } from '../utils/cn';

function formatCurrency(val) {
  if (val === undefined || val === null) return '';
  return val.toLocaleString('id-ID');
}

function CurrencyInput({ value, onChange, className, placeholder = '0', disabled }) {
  const inputRef = useRef(null);

  const handleInput = useCallback((e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const num = raw === '' ? 0 : parseInt(raw, 10);
    if (onChange) onChange(num);
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-medium text-tertiary pointer-events-none">Rp</span>
      <input ref={inputRef} type="text" inputMode="numeric"
        value={value > 0 ? formatCurrency(value) : ''}
        onChange={handleInput}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full text-right bg-black/20 border border-white/[0.06] rounded-xl py-2 pl-8 pr-3 text-xs font-medium text-primary outline-none transition-all hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary)] disabled:opacity-50"
      />
    </div>
  );
}

export default memo(CurrencyInput);
