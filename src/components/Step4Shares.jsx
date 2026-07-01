import { memo, useState, useMemo } from 'react';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import CurrencyInput from './CurrencyInput';
import Icon from './Icon';
import { cn } from '../utils/cn';

function Step4Shares({ receiptGrandTotal, setStep }) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const assignments = useBillStore((s) => s.assignments);
  const toggleAssignment = useBillStore((s) => s.toggleAssignment);
  const updatePerson = useBillStore((s) => s.updatePerson);
  const user = useAuthStore((s) => s.user);
  const isPremium = user?.tier === 'premium';
  const [splitTab, setSplitTab] = useState('equal');
  const [itemError, setItemError] = useState('');
  const persons = useMemo(() => bill.persons || [], [bill.persons]);
  const totalPercent = persons.reduce((s, p) => s + (p.percentage || 0), 0);
  const items = useMemo(() => bill.items || [], [bill.items]);
  const lineTotal = (item) => (item.unitPrice ?? item.price) * (item.qty ?? item.quantity ?? 1);
  const totalBillSubtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
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
          className="px-5 py-3 bg-gradient-to-r from-brand-primary to-indigo-500 text-white rounded-2xl font-semibold text-xs shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer"
        >
          <Icon name="arrow_back" className="text-xs" /> Back: Add People
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 flex-1 min-h-0 w-full text-primary">
      {/* Summary Bar */}
      <div className="bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
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
        <div className="flex items-center gap-2 bg-black/20 rounded-2xl p-0.5">
          {['equal', 'item', 'percent', 'custom'].map((tab) => (
            <button
              key={tab}
                onClick={() => {
                  if (!isPremium && (tab === 'percent' || tab === 'custom')) {
                    return;
                  }
                  setSplitTab(tab);
                  setItemError('');
                  const splitMap = { equal: 'equal', item: 'shared_items', percent: 'percentage', custom: 'custom' };
                  updateBill({ splitType: splitMap[tab] || 'equal' });
                }}
              className={cn(
                "px-3 py-1.5 text-[10px] font-medium rounded-xl transition-all border-none outline-none cursor-pointer",
                splitTab === tab ? "bg-brand-primary/10 text-brand-primary shadow-sm" : "text-tertiary hover:text-secondary"
              )}
            >
              {tab === 'equal' ? 'Equal' : tab === 'item' ? 'By Item' : tab === 'percent' ? 'Percent' : 'Custom'}
            </button>
          ))}
        </div>
      </div>

      {/* Split Content */}
      <div className="bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 flex flex-col flex-1 min-h-[400px] justify-between shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
        <div>
          {splitTab === 'equal' && (
            <div className="flex flex-col items-center justify-center text-center py-10 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-brand-primary/5 border border-brand-primary/10 text-brand-primary flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(124,92,255,0.1)]">
                <Icon name="call_split" className="text-2xl" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Split Equally</h3>
              <p className="text-xs text-secondary leading-relaxed mb-6">
                Divide the grand total of <span className="text-primary font-semibold">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span> equally among <span className="text-primary font-semibold">{persons.length}</span> participants.
              </p>
              <div className="bg-black/20 border border-white/[0.04] rounded-2xl p-5 w-full mb-6 font-numeric">
                <span className="text-[9px] font-medium text-tertiary uppercase tracking-wider block mb-1">Per Person</span>
                <span className="text-xl font-bold text-brand-primary">Rp {Math.round(receiptGrandTotal / (persons.length || 1)).toLocaleString('id-ID')}</span>
              </div>
              <button onClick={() => { assignAllToAll(); setStep(5); }}
                className="h-11 px-6 bg-gradient-to-r from-brand-primary to-indigo-500 text-white rounded-2xl text-xs font-semibold shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all border-none outline-none cursor-pointer"
              >
                Apply Equal Split
              </button>
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
                            <input type="checkbox" checked={isShared}
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
                              <input type="checkbox" checked={assignments[p.id]?.[item.id] || false}
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
                    className="h-11 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl text-xs font-semibold shadow-xl shadow-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.3)] transition-all border-none outline-none cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Icon name="stars" className="text-xs" /> Upgrade to Premium
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-medium text-tertiary tracking-wide">Adjust percentages</span>
                    <span className={cn("text-[10px] font-medium px-2.5 py-0.5 rounded-lg border",
                      totalPercent === 100 ? "text-emerald-400 bg-emerald-500/5 border-emerald-500/10" : "text-red-400 bg-red-500/5 border-red-500/10"
                    )}>Total: {totalPercent}%</span>
                  </div>
                  <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1 hide-scrollbar">
                    {persons.map((p) => {
                      const currentPercent = p.percentage || 0;
                      const allocatedAmount = Math.round(receiptGrandTotal * (currentPercent / 100));
                      return (
                        <div key={p.id} className="bg-black/20 border border-white/[0.04] rounded-2xl p-4 flex flex-col gap-3 font-numeric shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-primary">{p.name || 'Unnamed'}</span>
                            <span className="text-xs font-semibold text-brand-primary">Rp {allocatedAmount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <input type="range" min="0" max="100" value={currentPercent}
                              onChange={(e) => { const v = parseInt(e.target.value) || 0; updatePerson(p.id, { percentage: v }); }}
                              className="flex-1 accent-brand-primary h-1.5 bg-white/[0.04] rounded-full appearance-none cursor-pointer"
                            />
                            <div className="flex items-center gap-1">
                              <button onClick={() => updatePerson(p.id, { percentage: Math.max(0, currentPercent - 1) })}
                                className="w-6 h-6 rounded-lg bg-white/[0.04] border border-white/[0.06] text-tertiary hover:text-primary hover:bg-white/[0.08] text-sm flex items-center justify-center cursor-pointer transition-all"
                              >−</button>
                              <div className="w-14 relative">
                                <input type="number" min="0" max="100"
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
                    className="h-11 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl text-xs font-semibold shadow-xl shadow-amber-500/20 hover:shadow-[0_0_24px_rgba(245,158,11,0.3)] transition-all border-none outline-none cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <Icon name="stars" className="text-xs" /> Upgrade to Premium
                  </a>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-medium text-tertiary tracking-wide">Set custom amounts</span>
                    <span className="text-[10px] font-medium text-brand-primary bg-brand-primary/5 border border-brand-primary/10 px-2.5 py-0.5 rounded-lg">Total: Rp {totalBillSubtotal.toLocaleString('id-ID')}</span>
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

        <div className="mt-6 pt-5 border-t border-white/[0.04] flex justify-between items-center gap-3">
          <button onClick={() => setStep(3)}
            className="h-10 px-4 rounded-2xl bg-transparent border border-white/[0.06] text-secondary hover:text-primary hover:border-white/[0.1] text-[10px] font-medium transition-all flex items-center gap-1.5 cursor-pointer outline-none"
          >
            <Icon name="arrow_back" className="text-xs" /> Back
          </button>
          <div className="flex items-center gap-3">
            {itemError && <span className="text-[10px] font-medium text-red-400">{itemError}</span>}
            <button onClick={() => {
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
              className="h-10 px-5 bg-gradient-to-r from-brand-primary to-indigo-500 text-white rounded-2xl text-xs font-semibold shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer"
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
