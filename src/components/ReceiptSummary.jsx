import { memo } from 'react';

const fmtIDR = (v) => (v ?? 0).toLocaleString('id-ID');

const DualRow = ({ label, pct, flat, onPctChange, onFlatChange, amber }) => {
  const textColor = amber ? 'text-amber-300' : 'text-primary';
  const placeholderColor = amber ? 'placeholder:text-amber-400/30' : 'placeholder:text-tertiary/40';
  const borderColor = amber ? 'border-amber-500/20' : 'border-white/[0.06]';
  const focusStyles = amber
    ? 'focus-within:border-amber-500/50 focus-within:shadow-[0_0_0_1px_rgba(245,158,11,0.5)]'
    : 'focus-within:border-brand-primary/50 focus-within:shadow-[0_0_0_1px_var(--brand-primary)]';

  return (
    <div className="flex justify-between items-center">
      <span className="text-[11px] font-medium text-tertiary">{label}</span>
      <div className={`flex items-center h-10 bg-black/20 border rounded-xl px-2 w-56 transition-all ${borderColor} ${focusStyles}`}>
        <input type="number" value={Math.round(pct * 10) / 10}
          onChange={(e) => onPctChange(parseFloat(e.target.value) || 0)}
          className={`w-0 flex-1 bg-transparent border-none outline-none text-xs font-semibold p-0 text-right appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${textColor} ${placeholderColor}`}
          placeholder="0"
        />
        <span className="text-[9px] font-bold text-tertiary shrink-0 ml-0.5">%</span>

        <div className="w-px h-5 bg-white/[0.06] mx-1.5 shrink-0" />

        <span className="text-[9px] font-bold text-tertiary shrink-0 mr-0.5">Rp</span>
        <input type="number" value={flat}
          onChange={(e) => onFlatChange(parseFloat(e.target.value) || 0)}
          className={`w-0 flex-1 bg-transparent border-none outline-none text-xs font-semibold p-0 text-right appearance-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none [-moz-appearance:textfield] ${textColor} ${placeholderColor}`}
          placeholder="0"
        />
      </div>
    </div>
  );
};

const ReceiptSummary = memo(({
  subtotal,
  discount, onDiscountChange,
  tax, onTaxChange,
  serviceCharge, onServiceChange,
  grandTotal,
}) => {
  const toPct = (flat) => subtotal > 0 ? (flat / subtotal) * 100 : 0;
  const discountPct = toPct(discount);
  const taxPct = toPct(tax);
  const servicePct = toPct(serviceCharge);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-[11px] font-medium text-tertiary">Subtotal</span>
        <span className="text-sm font-semibold text-primary font-numeric w-36 text-right">
          Rp {fmtIDR(subtotal)}
        </span>
      </div>

      <DualRow label="Discount" pct={discountPct} flat={discount}
        onPctChange={(p) => onDiscountChange(Math.round(subtotal * p / 100))}
        onFlatChange={(v) => onDiscountChange(v)}
        amber
      />

      <DualRow label="Tax" pct={taxPct} flat={tax}
        onPctChange={(p) => onTaxChange(Math.round(subtotal * p / 100))}
        onFlatChange={(v) => onTaxChange(v)}
      />

      <DualRow label="Service Fee" pct={servicePct} flat={serviceCharge}
        onPctChange={(p) => onServiceChange(Math.round(subtotal * p / 100))}
        onFlatChange={(v) => onServiceChange(v)}
      />

      <div className="pt-4 mt-4 border-t border-white/[0.06]">
        <div className="flex justify-between items-center">
          <span className="text-sm font-bold text-primary">Grand Total</span>
          <span className="text-xl font-black text-brand-primary font-numeric w-36 text-right">
            Rp {fmtIDR(grandTotal)}
          </span>
        </div>
      </div>
    </div>
  );
});

export default ReceiptSummary;
