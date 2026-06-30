import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import DebtMap from './DebtMap';
import Icon from './Icon';

function Step5Settlement({
  receiptSubtotal, receiptDiscount, personTotals, setActiveTab
}) {
  const [toastMsg, setToastMsg] = useState(null);
  const bill = useBillStore((s) => s.bill);
  const updatePerson = useBillStore((s) => s.updatePerson);
  const completeBill = useBillStore((s) => s.completeBill);
  const resetBill = useBillStore((s) => s.resetBill);
  const updateUI = useBillStore((s) => s.updateUI);
  const totalGrand = personTotals.reduce((sum, p) => sum + p.total, 0);
  const handleSave = async (status) => {
    try {
      await completeBill(status);
    } catch (err) {
      setToastMsg(err?.message || 'Failed to save bill');
      setTimeout(() => setToastMsg(null), 5000);
      return;
    }
    resetBill();
    updateUI({ step: 1 });
    setActiveTab('dashboard');
  };
  const totalService = bill.serviceMode === 'percent' ? receiptSubtotal * (bill.serviceCharge / 100) : (bill.serviceCharge || 0);
  const totalTax = bill.taxMode === 'percent' ? receiptSubtotal * (bill.tax / 100) : (bill.tax || 0);
  const totalTaxAndService = totalTax + totalService;
  const personsMap = new Map(bill.persons.map(p => [p.id, p]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-12 gap-6 w-full text-primary"
    >
      {/* Left: Totals + Shares + DebtMap */}
      <div className="col-span-12 lg:col-span-7 space-y-5">
        {/* Grand Total */}
        <div className="bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 relative overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
          <div className="absolute top-0 right-0 w-40 h-40 bg-brand-primary/5 rounded-full blur-3xl pointer-events-none" />
          <span className="text-[10px] font-medium text-tertiary uppercase tracking-wider block mb-1">Grand Total</span>
          <h3 className="text-4xl font-bold text-primary font-numeric tracking-tight mb-5">Rp {totalGrand.toLocaleString('id-ID')}</h3>
          <div className="space-y-2 pt-5 border-t border-white/[0.04] font-numeric">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-medium text-tertiary uppercase tracking-wider">Subtotal</span>
              <span className="text-sm font-semibold text-secondary">Rp {receiptSubtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-medium text-tertiary uppercase tracking-wider">Tax & Service</span>
              <span className="text-sm font-semibold text-secondary">Rp {totalTaxAndService.toLocaleString('id-ID')}</span>
            </div>
            {receiptDiscount > 0 && (
              <div className="mt-1 pt-2 border-t border-amber-500/10 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                <span className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider">You saved</span>
                <span className="text-xs font-bold text-amber-400">Rp {receiptDiscount.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Individual Shares */}
        <div>
          <h4 className="text-[10px] font-medium text-tertiary uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-1 h-3 bg-brand-primary rounded-full inline-block" />
            Settlement Shares
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1 hide-scrollbar">
            {personTotals.map((p) => (
              <div key={p.id} className="bg-surface-elevated/60 backdrop-blur-sm border border-white/[0.04] rounded-2xl p-4 hover:border-white/[0.08] transition-all font-numeric shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-xs font-bold text-brand-primary">
                    {p.name.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-primary">{p.name || 'Unnamed'}</h5>
                    <span className="text-[8px] font-medium text-tertiary uppercase tracking-wider">Participant</span>
                  </div>
                </div>
                <div className="space-y-1 pt-3 border-t border-white/[0.04] text-[11px] text-secondary">
                  <div className="flex justify-between">
                    <span>Items</span>
                    <span className="font-medium text-primary">Rp {p.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax & Service</span>
                    <span className="font-medium text-primary">Rp {((p.tax || 0) + (p.service || 0)).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.04] flex justify-between items-center">
                  <span className="text-[9px] font-semibold text-brand-primary uppercase tracking-wider">Total due</span>
                  <span className="text-sm font-bold text-primary">Rp {p.total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DebtMap />
      </div>

      {/* Right: Transfer Details + Actions */}
      <div className="col-span-12 lg:col-span-5 bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 flex flex-col justify-between min-h-[500px] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="space-y-5">
          <h4 className="text-[10px] font-medium text-tertiary uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-3 bg-brand-primary rounded-full inline-block" />
            Transfer Details
          </h4>
          {bill.payerId ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-black/20 border border-white/[0.04] rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-sm font-bold text-brand-primary uppercase">
                  {personsMap.get(bill.payerId)?.name?.charAt(0) || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-medium text-tertiary uppercase tracking-wider block">Payer</span>
                  <span className="text-xs font-semibold text-primary block truncate">{personsMap.get(bill.payerId)?.name || 'Unnamed'}</span>
                </div>
                <div className="text-right font-numeric">
                  <span className="text-[9px] font-medium text-tertiary uppercase tracking-wider block">To Receive</span>
                  <span className="text-xs font-bold text-brand-primary">Rp {(totalGrand - (personTotals.find(p => p.id === bill.payerId)?.total || 0)).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="bg-black/20 border border-white/[0.04] p-4 rounded-2xl space-y-3">
                <span className="text-[9px] font-medium text-tertiary uppercase tracking-wider block">Payment Info</span>
                <div className="relative">
                  <Icon name="account_balance" className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm pointer-events-none" />
                  <input placeholder="Bank Name (e.g. BCA)"
                    value={bill.persons.find(p => p.id === bill.payerId)?.paymentInfo?.bank || ''}
                    onChange={(e) => updatePerson(bill.payerId, { paymentInfo: { ...bill.persons.find(p => p.id === bill.payerId)?.paymentInfo, bank: e.target.value } })}
                    className="w-full h-11 pl-9 pr-3 bg-black/20 border border-white/[0.06] rounded-xl text-xs font-medium text-primary placeholder:text-tertiary/60 transition-all hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary)] focus:outline-none"
                  />
                </div>
                <div className="relative">
                  <Icon name="credit_card" className="absolute left-3 top-1/2 -translate-y-1/2 text-tertiary text-sm pointer-events-none" />
                  <input placeholder="Account Number"
                    value={bill.persons.find(p => p.id === bill.payerId)?.paymentInfo?.accountNumber || ''}
                    onChange={(e) => updatePerson(bill.payerId, { paymentInfo: { ...bill.persons.find(p => p.id === bill.payerId)?.paymentInfo, accountNumber: e.target.value } })}
                    className="w-full h-11 pl-9 pr-3 bg-black/20 border border-white/[0.06] rounded-xl text-xs font-medium text-primary placeholder:text-tertiary/60 transition-all hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary)] focus:outline-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-black/20 rounded-2xl border border-dashed border-white/[0.06]">
              <Icon name="person_off" className="text-2xl text-tertiary mb-2" />
              <p className="text-[11px] text-tertiary font-medium leading-relaxed max-w-[200px]">
                Select who paid the bill in the previous step to configure payment details.
              </p>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3 pt-5 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleSave('draft')}
              className="h-11 rounded-2xl bg-transparent border border-white/[0.06] hover:bg-white/[0.04] text-secondary hover:text-primary text-xs font-medium transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none"
            >
              <Icon name="drafts" className="text-sm text-brand-primary" /> Save Draft
            </button>
            <button onClick={() => handleSave('pending')}
              className="h-11 rounded-2xl bg-gradient-to-r from-brand-primary to-indigo-500 text-white text-xs font-semibold shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none outline-none"
            >
              <Icon name="check_circle" className="text-sm" /> Finalize Split
            </button>
          </div>
          <button
            onClick={() => {
              const payer = bill.persons.find(p => p.id === bill.payerId);
              if (!payer) { setToastMsg('Please select a payer first.'); setTimeout(() => setToastMsg(null), 3000); return; }
              const otherTotals = personTotals.filter(p => p.id !== bill.payerId && p.total > 0);
              const totalToReceive = totalGrand - (personTotals.find(p => p.id === bill.payerId)?.total || 0);
              const message = `✨ *SplitMate Settlement: ${bill.title || 'Untitled'}* ✨\n\nTotal: *Rp ${totalToReceive.toLocaleString('id-ID')}*\n${otherTotals.map(p => `💸 ${p.name}: Rp ${p.total.toLocaleString('id-ID')}`).join('\n')}\n\n🏦 Transfer to ${payer.name}\n${payer.paymentInfo?.bank || 'Bank'}: ${payer.paymentInfo?.accountNumber || 'Account'}`;
              const waWindow = window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
              if (!waWindow || waWindow.closed) {
                navigator.clipboard?.writeText(message);
                setToastMsg('Copied to clipboard.');
                setTimeout(() => setToastMsg(null), 5000);
              }
            }}
            className="w-full h-11 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 hover:bg-emerald-950/30 text-emerald-400 text-xs font-medium transition-all flex items-center justify-center gap-2 cursor-pointer outline-none"
          >
            <Icon name="share" className="text-sm" />
            Share via WhatsApp
          </button>
        </div>
      </div>

      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-surface-elevated/90 backdrop-blur-xl border border-white/[0.06] rounded-xl shadow-xl text-xs font-medium text-primary" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </motion.div>
  );
}

export default memo(Step5Settlement);
