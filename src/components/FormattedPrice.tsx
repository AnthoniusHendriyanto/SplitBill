import { memo } from 'react';
import useBillStore from '../store/useBillStore';
import { formatCurrency } from '../utils/currency';

interface FormattedPriceProps {
  value: number;
  className?: string;
}

function FormattedPrice({ value, className = '' }: FormattedPriceProps) {
  const currency = useBillStore((s) => s.settings?.currency || 'IDR');
  return (
    <span className={className}>
      {formatCurrency(value, currency)}
    </span>
  );
}

export default memo(FormattedPrice);
