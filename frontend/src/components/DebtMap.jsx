import { memo } from 'react';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';

function DebtMap() {
  const bill = useBillStore((s) => s.bill);
  const calculateTotals = useBillStore((s) => s.calculateTotals);
  const totals = calculateTotals();
  const payer = bill.persons.find(p => p.id === bill.payerId) || bill.persons[0];

  if (!payer || totals.length === 0) return null;
  const debtors = totals.filter(p => p.id !== payer.id);

  return (
    <div className="w-full bg-[--surface-elevated] border border-[--border] rounded-2xl p-6 shadow-card">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-[--brand-primary-subtle] border border-[--brand-primary]/15 flex items-center justify-center">
          <Icon name="account_tree" className="text-base text-[--brand-primary]" />
        </div>
        <h3 className="text-lg font-bold tracking-tight text-primary">Who pays whom</h3>
      </div>

      <div className="relative pl-2">
        <div className="absolute left-[23px] top-4 bottom-4 w-0.5 bg-[--brand-primary]/20" />

        {/* Payer */}
        <div className="flex items-center gap-4 mb-6 relative">
          <div className="w-3 h-3 rounded-full bg-[--brand-primary] relative z-10 shrink-0 mt-0.5 ml-0.5" />
          <div className="flex-1 bg-[--brand-primary] rounded-xl p-4 text-[--text-inverse]">
            <p className="text-[9px] uppercase tracking-widest font-bold opacity-70 mb-0.5">Payer</p>
            <p className="font-bold text-sm">{payer.name || 'Payer'}</p>
          </div>
        </div>

        {/* Debtors */}
        {debtors.map((person) => (
          <div key={person.id} className="flex items-center gap-4 mb-4 relative">
            <div className="absolute left-[21px] top-1/2 w-5 h-0.5 bg-[--border]" />
            <div className="w-3 h-3 rounded-full bg-[--text-tertiary] relative z-10 shrink-0 mt-0.5 ml-0.5" />
            <div className="min-w-0 flex-1 bg-[--surface-raised] rounded-xl p-4 border border-[--border] flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon name="person" className="text-sm text-[--text-tertiary]" />
                <span className="font-semibold text-sm text-[--text-primary]">{person.name || '...'}</span>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-widest font-bold text-[--text-tertiary] mb-0.5">Owes</p>
                <p className="font-bold text-sm text-[--semantic-error]">Rp {person.total.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </div>
        ))}

        {debtors.length === 0 && (
          <div className="text-center py-6 text-xs text-[--text-tertiary] font-medium border-2 border-dashed border-[--border] rounded-xl ml-8">
            No debt assignments yet.
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(DebtMap);
