import { memo } from 'react';
import { cn } from '../utils/cn';

const PriceInput = memo(({ 
  value, 
  onChange, 
  className, 
  placeholder = "0",
  variant = "default" // "default" or "ghost"
}) => {
  const formatIDR = (val) => {
    if (val === undefined || val === null || val === '') return '';
    return val.toLocaleString('id-ID');
  };

  const handleInputChange = (e) => {
    const rawValue = e.target.value.replace(/[^0-9.]/g, '');
    if (/^\d*\.?\d*$/.test(rawValue)) {
      onChange(rawValue === '' ? 0 : parseFloat(rawValue) || 0);
    }
  };

  if (variant === "ghost") {
    return (
      <div className={cn("flex items-center justify-end gap-2 group-focus-within:text-indigo-600 transition-colors", className)}>
        <span className="text-xs font-black text-secondary">Rp</span>
        <input 
          type="text"
          value={value === 0 ? '' : value}
          onChange={handleInputChange}
          className="w-32 bg-transparent border-none focus:ring-0 text-right font-black text-primary p-0 text-xl outline-none"
          placeholder={placeholder}
        />
      </div>
    );
  }

  return (
    <div className={cn("relative flex items-center", className)}>
      <span className="absolute left-3 text-secondary font-bold text-xs">Rp</span>
      <input
        type="text"
        value={formatIDR(value)}
        onChange={handleInputChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-surface-base border border-slate-200 dark:border-strong rounded-xl text-sm font-bold text-primary outline-none ring-indigo-500/20 focus:ring-2 transition-all"
      />
    </div>
  );
});

export default PriceInput;
