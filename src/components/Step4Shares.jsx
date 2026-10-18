import { memo, useState, useMemo } from 'react';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import CurrencyInput from './CurrencyInput';
import Icon from './Icon';
import { cn } from '../utils/cn';
import { splitError, calculateShares } from '../utils/shares';

function Step4Shares({ receiptGrandTotal, setStep }) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const assignments = useBillStore((s) => s.assignments);
  const toggleAssignment = useBillStore((s) => s.toggleAssignment);
  const updatePerson = useBillStore((s) => s.updatePerson);
  const user = useAuthStore((s) => s.user);
  const isPremium = user?.tier === 'premium' && new Date(user.premium_expires_at) > new Date();
  const [splitTab, setSplitTab] = useState(() => ({ shared_items: 'item', percentage: 'percent', custom: 'custom' }[bill.splitType] || 'equal'));
  const [itemError, setItemError] = useState('');
  const persons = useMemo(() => bill.persons || [], [bill.persons]);
  const totalPercent = persons.reduce((s, p) => s + (p.percentage || 0), 0);
  const items = useMemo(() => bill.items || [], [bill.items]);
  const lineTotal = (item) => (item.unitPrice ?? item.price) * (item.qty ?? item.quantity ?? 1);
  const previews = calculateShares(bill, assignments);
  const assignAllToAll = () => {
    persons.forEach(p => items.forEach(item => { if (!assignments[p.id]?.[item.id]) toggleAssignment(p.id, item.id); }));
  };
  const payerName = useMemo(() => persons.find(p => p.id === bill.payerId)?.name || 'None selected', [persons, bill.payerId]);

  if (persons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 min-h-0 w-full text-primary p-8">
        <Icon name="people_outline" className="text-6xl text-tertiary mb-4" />
        <p className="text-sm font-bold text-tertiary mb-1">No participants added</p>
        <p className="text-[10px] text-tertiary mb-6">Go back to Step 3 and add people first.</p>
        <button onClick={() => setStep(3)}
          className="px-5 py-3 bg-[--brand-primary] hover:bg-[--brand-primary-hover] active:scale-[0.98] text-[--text-inverse] rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer"
        >
          <Icon name="arrow_back" className="text-xs" /> Back: Add People
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0 w-full text-primary">
      {/* Summary Bar */}
      <div className="receipt-panel p-5 sm:p-6 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
        <div className="flex items-center gap-6 font-numeric">
          <div>
            <span className="text-[9px] font-medium text-tertiary uppercase tracking-wider block mb-0.5">Grand Total</span>
            <span className="text-2xl font-bold text-primary">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span>
          </div>
          <div className="hidden md:block w-px h-8 bg-white/[0.04]" />
          <div>
            <span className="text-[9px] font-medium text-tertiary uppercase tracking-wider block mb-0.5">Payer</span>
            <span className="text-sm font-semibold text-brand-primary flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
              {payerName}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 w-full xl:w-auto gap-2" role="group" aria-label="Split method">
          {['equal', 'item', 'percent', 'custom'].map((tab) => (
            <button
              key={tab}
                onClick={() => {
                  if (!isPremium && tab !== 'equal') {
                    setItemError('By Item, Percent and Custom splits require Premium.');
                    return;
                  }
                  setSplitTab(tab);
                  setItemError('');
                  const splitMap = { equal: 'equal', item: 'shared_items', percent: 'percentage', custom: 'custom' };
                  updateBill({ splitType: splitMap[tab] || 'equal' });
                }}
              className={cn(
                "px-4 py-3 text-sm font-semibold rounded-xl transition-colors border cursor-pointer flex items-center justify-center gap-2",
                splitTab === tab ? "bg-brand-primary text-[#151714] border-transparent" : "text-secondary border-border hover:bg-surface-raised"
              )}
              aria-pressed={splitTab === tab}
            >
              {!isPremium && tab !== 'equal' && <Icon name="lock" className="text-sm" />}
              {tab === 'equal' ? 'Equal' : tab === 'item' ? 'By Item' : tab === 'percent' ? 'Percent' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Split Content */}
      <div className="bg-[--surface-elevated] border border-[--border] rounded-2xl p-6 flex flex-col flex-1 min-h-[400px] justify-between shadow-card">
        <div>
          {splitTab === 'equal' && (
            <div className="flex flex-col items-center justify-center text-center py-10 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[--brand-primary-subtle] border border-[--brand-primary]/20 text-[--brand-primary] flex items-center justify-center mb-5 shadow-sm">
                <Icon name="call_split" className="text-2xl" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight text-primary mb-2">Same table. Same share.</h3>
              <p className="text-xs text-secondary leading-relaxed mb-6">
                Divide the grand total of <span className="text-primary font-semibold tabular-nums">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span> equally among <span className="text-primary font-semibold">{persons.length}</span> participants.
              </p>
              <div className="receipt-panel p-6 w-full mb-4 font-numeric">
                <span className="text-[11px] font-medium text-tertiary uppercase tracking-wider block mb-1">Per person, from</span>
                <span className="text-4xl font-extrabold tracking-tighter text-primary tabular-nums">Rp {Math.min(...previews.map(p => p.total)).toLocaleString('id-ID')}</span>
                <p className="text-xs text-secondary mt-2">Any remaining cents are assigned in participant order.</p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">{persons.map(p => <span key={p.id} className="px-3 py-2 rounded-full bg-brand-subtle text-sm text-primary">{p.name}</span>)}</div>
            </div>
          )}

          {splitTab === 'item' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-medium text-tertiary tracking-wide">Assign items to people</span>
                <button onClick={() => assignAllToAll()}
                  className="h-8 px-3 rounded-xl bg-transparent border border-white/[0.06] hover:bg-white/[0.04] text-tertiary hover:text-secondary text-[10px] font-medium transition-all cursor-pointer"
                >
                  Assign All
                </button>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-white/[0.04] bg-black/20 hide-scrollbar shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                <table className="w-full border-collapse text-left text-xs font-medium font-numeric">
                  <thead>
                    <tr className="border-b border-white/[0.04]">
                      <th scope="col" className="px-5 py-3.5 text-[9px] font-semibold text-tertiary uppercase tracking-wider sticky left-0 z-20 min-w-[180px]">Item</th>
                      <th scope="col" className="px-5 py-3.5 text-[9px] font-semibold text-tertiary uppercase tracking-wider text-right">Price</th>
                      <th scope="col" className="px-5 py-3.5 text-[9px] font-semibold text-brand-primary uppercase tracking-wider text-center w-16">All</th>
                      {persons.map(p => (
                        <th key={p.id} scope="col" className="px-3 py-3.5 text-[9px] font-semibold text-secondary uppercase tracking-wider text-center min-w-[90px] truncate">{p.name || '...'}</th>
                      ))}
                      <th scope="col" className="px-5 py-3.5 text-[9px] font-semibold text-brand-primary uppercase tracking-wider text-right sticky right-0 z-20 w-28">Share</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {items.map(item => {
                      const assignedCount = persons.filter(p => assignments[p.id]?.[item.id]).length;
                      const itemTotal = lineTotal(item);
                      const costPerPerson = assignedCount > 0 ? Math.round(itemTotal / assignedCount) : 0;
                      const isShared = persons.length > 0 && persons.every(p => assignments[p.id]?.[item.id]);
                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="px-5 py-3.5 font-medium text-primary truncate max-w-[180px]">{item.name || 'Item'}</td>
                          <td className="px-5 py-3.5 text-right text-secondary text-[11px]">Rp {itemTotal.toLocaleString('id-ID')}</td>
                          <td className="px-5 py-3.5 text-center">
                            <input type="checkbox" checked={isShared} aria-label={`Assign ${item.name || 'item'} to everyone`}
                              onChange={() => {
                                const targetVal = !isShared;
                                persons.forEach(p => {
                                  const currentlyAssigned = !!assignments[p.id]?.[item.id];
                                  if (currentlyAssigned !== targetVal) toggleAssignment(p.id, item.id);
                                });
                              }}
                              className="w-3.5 h-3.5 rounded border-white/[0.1] bg-transparent text-brand-primary focus:ring-0 cursor-pointer"
                            />
                          </td>
                          {persons.map(p => (
                            <td key={p.id} className="px-3 py-3.5 text-center">
                              <input type="checkbox" checked={assignments[p.id]?.[item.id] || false} aria-label={`Assign ${item.name || 'item'} to ${p.name}`}
                                onChange={() => toggleAssignment(p.id, item.id)}
                                className="w-3.5 h-3.5 rounded border-white/[0.1] bg-transparent text-brand-primary focus:ring-0 cursor-pointer"
                              />
                            </td>
                          ))}
                          <td className="px-5 py-3.5 text-right text-brand-primary font-semibold text-[11px]">Rp {costPerPerson.toLocaleString('id-ID')}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {splitTab === 'percent' && (
            <div className="max-w-2xl mx-auto w-full space-y-5 py-4">
              {!isPremium ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5">
                    <Icon name="lock" className="text-2xl" />
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2">Premium Feature</h3>
                  <p className="text-xs text-secondary leading-relaxed mb-6 max-w-sm">
                    Percentage-based splitting is available for premium users. Upgrade to unlock more split methods.
                  </p>
                  <a href="/settings?tab=billing"
                    className="h-11 px-6 bg-[--semantic-warning] hover:opacity-90 active:scale-[0.98] text-[--text-inverse] rounded-xl text-xs font-bold shadow-sm transition-all border-none outline-none cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Icon name="stars" className="text-xs" /> Upgrade to Premium
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-medium text-tertiary tracking-wide">Adjust percentages</span>
                    <span className={cn("text-[10px] font-medium px-2.5 py-0.5 rounded-lg border",
                      totalPercent === 100
                        ? "text-[--brand-primary] bg-[--brand-primary-subtle] border-[--brand-primary]/20"
                        : "text-error bg-toast-error border-error"
                    )}>Total: {totalPercent}%</span>
                  </div>
                  <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 hide-scrollbar">
                    {persons.map((p) => {
                      const currentPercent = p.percentage || 0;
                      const allocatedAmount = previews.find(person => person.id === p.id)?.total || 0;
                      return (
                        <div key={p.id} className="bg-black/20 border border-white/[0.04] rounded-2xl p-4 flex flex-col gap-3 font-numeric shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-primary">{p.name || 'Unnamed'}</span>
                            <span className="text-xs font-semibold text-brand-primary">Rp {allocatedAmount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input type="range" aria-label={`${p.name} percentage`} min="0" max="100" value={currentPercent}
                              onChange={(e) => { const v = parseInt(e.target.value) || 0; updatePerson(p.id, { percentage: v }); }}
                              className="flex-1 accent-brand-primary h-1.5 bg-white/[0.04] rounded-full appearance-none cursor-pointer"
                            />
                            <div className="flex items-center gap-1">
                              <button onClick={() => updatePerson(p.id, { percentage: Math.max(0, currentPercent - 1) })}
                                className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] text-tertiary hover:text-primary hover:bg-white/[0.08] text-sm flex items-center justify-center cursor-pointer transition-all"
                              >−</button>
                              <div className="w-14 relative">
                                <input type="number" aria-label={`${p.name} percentage value`} min="0" max="100"
                                  value={currentPercent === 0 ? '' : currentPercent}
                                  onChange={(e) => { const v = parseInt(e.target.value) || 0; updatePerson(p.id, { percentage: Math.min(100, Math.max(0, v)) }); }}
                                  className="w-full text-center bg-black/20 border border-white/[0.06] rounded-xl py-1.5 px-1 text-xs font-medium text-primary outline-none focus:border-brand-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" placeholder="0"
                                />
                              </div>
                              <button onClick={() => updatePerson(p.id, { percentage: Math.min(100, currentPercent + 1) })}
                                className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] text-tertiary hover:text-primary hover:bg-white/[0.08] text-sm flex items-center justify-center cursor-pointer transition-all"
                              >+</button>
                              <span className="text-[9px] font-medium text-tertiary w-3">%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {splitTab === 'custom' && (
            <div className="max-w-xl mx-auto w-full space-y-5 py-4">
              {!isPremium ? (
                <div className="flex flex-col items-center justify-center text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-5">
                    <Icon name="lock" className="text-2xl" />
                  </div>
                  <h3 className="text-lg font-bold text-primary mb-2">Premium Feature</h3>
                  <p className="text-xs text-secondary leading-relaxed mb-6 max-w-sm">
                    Custom amount splitting is available for premium users. Upgrade to unlock more split methods.
                  </p>
                  <a href="/settings?tab=billing"
                    className="h-11 px-6 bg-[--semantic-warning] hover:opacity-90 active:scale-[0.98] text-[--text-inverse] rounded-xl text-xs font-bold shadow-sm transition-all border-none outline-none cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Icon name="stars" className="text-xs" /> Upgrade to Premium
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-medium text-tertiary tracking-wide">Final amounts, including fees and discount</span>
                    <span className="text-[10px] font-medium text-brand-primary bg-brand-primary/5 border border-brand-primary/10 px-2.5 py-0.5 rounded-lg">Total: Rp {receiptGrandTotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 hide-scrollbar">
                    {persons.map((p) => {
                      const currentAmount = p.customAmount || 0;
                      return (
                        <div key={p.id} className="bg-black/20 border border-white/[0.04] rounded-2xl p-4 flex justify-between items-center font-numeric shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                          <span className="text-xs font-medium text-primary">{p.name || 'Unnamed'}</span>
                          <CurrencyInput value={currentAmount} onChange={(v) => updatePerson(p.id, { customAmount: v })} className="w-44" />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 pt-5 receipt-divider flex flex-wrap justify-between items-center gap-3">
          <button onClick={() => setStep(3)}
            className="h-10 px-4 rounded-2xl bg-transparent border border-white/[0.06] text-secondary hover:text-primary hover:border-white/[0.1] text-[10px] font-medium transition-all flex items-center gap-1.5 cursor-pointer outline-none"
          >
            <Icon name="arrow_back" className="text-xs" /> Back
          </button>
          <div className="flex flex-wrap items-center gap-3">
            {itemError && <span role="alert" className="text-sm font-medium text-error max-w-sm">{itemError}</span>}
             <button onClick={() => {
              if (!isPremium && (splitTab === 'custom' || splitTab === 'percent')) { setItemError('This split method requires Premium.'); return; }
              const error = splitError(bill);
              if (error) { setItemError(error); return; }
              if (splitTab === 'equal') { updateBill({ splitType: 'equal' }); assignAllToAll(); }
              if (splitTab === 'percent' && totalPercent !== 100) {
                setItemError(`Percentages must total 100% (currently ${totalPercent}%)`);
                return;
              }
              if (splitTab === 'item') {
                const unassigned = items.filter(item => !persons.some(p => assignments[p.id]?.[item.id]));
                if (unassigned.length > 0) {
                  setItemError(`${unassigned.length} item(s) not assigned to anyone`);
                  return;
                }
              }
              setItemError('');
              setStep(5);
            }}
              className="h-10 px-5 bg-[--brand-primary] hover:bg-[--brand-primary-hover] active:scale-[0.98] text-[--text-inverse] rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer"
            >
              Continue
              <Icon name="arrow_forward" className="text-xs" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(Step4Shares);
