import { memo } from 'react';
import { cn } from '../utils/cn';

const MinusIcon = () => (
  <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
    <path d="M1 1h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const PlusIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M1 5h8M5 1v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const QuantityInput = memo(({ value, onChange, min = 1, className }) => {
  const atMin = value <= min;

  return (
    <div className={cn(
      "flex items-center bg-black/20 border border-white/[0.06] rounded-xl overflow-hidden",
      className
    )}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={atMin}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cn(
          "w-9 h-11 shrink-0 flex items-center justify-center border-none outline-none transition-colors",
          atMin
            ? "text-tertiary/30 cursor-not-allowed"
            : "text-tertiary hover:text-primary hover:bg-white/[0.04] cursor-pointer"
        )}
      >
        <MinusIcon />
      </button>
      <input
        type="number"
        aria-label="Quantity"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value, 10);
          if (!isNaN(v)) onChange(Math.max(min, v));
        }}
        className="w-8 min-w-0 bg-transparent border-none outline-none text-sm font-semibold text-primary font-numeric text-center p-0 appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield]"
        min={min}
      />
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(value + 1)}
        className="w-9 h-11 shrink-0 flex items-center justify-center text-tertiary hover:text-primary hover:bg-surface-raised border-none outline-none cursor-pointer transition-colors"
      >
        <PlusIcon />
      </button>
    </div>
  );
});

export default QuantityInput;
