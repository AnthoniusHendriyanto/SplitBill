import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import DebtMap from './DebtMap';
import Icon from './Icon';

function Step5Settlement({
  receiptSubtotal, personTotals, setActiveTab
}) {
  const [toastMsg, setToastMsg] = useState(null);
  const bill = useBillStore((s) => s.bill);
  const updatePerson = useBillStore((s) => s.updatePerson);
  const completeBill = useBillStore((s) => s.completeBill);
  const totalGrand = personTotals.reduce((sum, p) => sum + p.total, 0);
  const totalTaxAndService = totalGrand - receiptSubtotal;
  const personsMap = new Map(bill.persons.map(p => [p.id, p]));

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="grid grid-cols-12 gap-8 w-full text-slate-200"
    >
      <div className="col-span-12 lg:col-span-7 space-y-6">
        <div className="bg-gradient-to-br from-gradient-start to-gradient-end border border-slate-900 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">Grand Total</span>
          <h3 className="text-5xl font-black text-white font-numeric tracking-tight mb-6">Rp {totalGrand.toLocaleString('id-ID')}</h3>
          <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-900/60 font-numeric">
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Subtotal</span>
              <span className="text-sm font-bold text-slate-350">Rp {receiptSubtotal.toLocaleString('id-ID')}</span>
            </div>
            <div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Taxes & Services</span>
              <span className="text-sm font-bold text-slate-350">Rp {totalTaxAndService.toLocaleString('id-ID')}</span>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl" />
        </div>
        <div className="space-y-4">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
            Individual Settlement shares
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[360px] overflow-y-auto pr-1 hide-scrollbar">
            {personTotals.map((p) => (
              <div key={p.id} className="bg-card border border-slate-900 hover:border-slate-800 rounded-2xl p-5 flex flex-col justify-between transition-all group font-numeric">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-slate-950 border border-slate-900 flex items-center justify-center text-xs font-bold text-indigo-400">
                    {p.name.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-white">{p.name || 'Unnamed'}</h5>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Participant</span>
                  </div>
                </div>
                <div className="space-y-1.5 pt-3 border-t border-slate-950 text-[11px] font-bold text-slate-400">
                  <div className="flex justify-between">
                    <span>Items Share</span>
                    <span>Rp {p.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax & Service</span>
                    <span>Rp {((p.tax || 0) + (p.service || 0)).toLocaleString('id-ID')}</span>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-950 flex justify-between items-center">
                  <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Total due</span>
                  <span className="text-sm font-black text-white">Rp {p.total.toLocaleString('id-ID')}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <DebtMap persons={bill.persons} personTotals={personTotals} payerId={bill.payerId} />
      </div>
      <div className="col-span-12 lg:col-span-5 space-y-6 bg-card border border-slate-900 rounded-3xl p-6 flex flex-col justify-between min-h-[500px]">
        <div className="space-y-6">
          <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
            Transfer Methods
          </h4>
          {bill.payerId ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-slate-950/40 border border-slate-900 rounded-xl">
                <div className="w-10 h-10 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center text-sm font-black text-indigo-400 uppercase">
                  {personsMap.get(bill.payerId)?.name?.charAt(0) || 'P'}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Payer</span>
                  <span className="text-xs font-bold text-white block truncate">{personsMap.get(bill.payerId)?.name || 'Unnamed'}</span>
                </div>
                <div className="text-right font-numeric">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">To Receive</span>
                  <span className="text-xs font-black text-indigo-400">Rp {(totalGrand - (personTotals.find(p => p.id === bill.payerId)?.total || 0)).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="bg-slate-950/40 border border-slate-900 p-4 rounded-xl space-y-3">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Update Transfer Details</span>
                <div className="relative">
                  <Icon name="account_balance" className="absolute left-3 top-2.5 text-slate-500 text-xs" />
                  <input placeholder="Bank Name (e.g. BCA, Mandiri)"
                    value={bill.persons.find(p => p.id === bill.payerId)?.paymentInfo?.bank || ''}
                    onChange={(e) => updatePerson(bill.payerId, { paymentInfo: { ...bill.persons.find(p => p.id === bill.payerId)?.paymentInfo, bank: e.target.value } })}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-900 rounded-lg focus:border-indigo-500 outline-none text-white font-bold"
                  />
                </div>
                <div className="relative">
                  <Icon name="credit_card" className="absolute left-3 top-2.5 text-slate-500 text-xs" />
                  <input placeholder="Account Number"
                    value={bill.persons.find(p => p.id === bill.payerId)?.paymentInfo?.accountNumber || ''}
                    onChange={(e) => updatePerson(bill.payerId, { paymentInfo: { ...bill.persons.find(p => p.id === bill.payerId)?.paymentInfo, accountNumber: e.target.value } })}
                    className="w-full pl-9 pr-3 py-2.5 text-xs bg-slate-950 border border-slate-900 rounded-lg focus:border-indigo-500 outline-none text-white font-bold"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4 bg-slate-950/20 rounded-xl border border-dashed border-slate-900">
              <Icon name="person_off" className="text-2xl text-slate-700 mb-2" />
              <p className="text-[11px] text-slate-500 font-bold leading-relaxed max-w-[200px]">
                Please select who settled the bill in Step 3 to configure payer payment routing.
              </p>
            </div>
          )}
        </div>
        <div className="mt-8 space-y-4 pt-6 border-t border-slate-900">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={async () => {
                try {
                  await completeBill('draft');
                } catch {
                  // Fallback to local
                }
                setActiveTab('dashboard');
              }}
              className="py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 text-slate-400 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none"
            >
              <Icon name="drafts" className="text-sm text-indigo-400" /> Save as Draft
            </button>
            <button
              onClick={async () => {
                try {
                  await completeBill('pending');
                } catch {
                  // Fallback to local
                }
                setActiveTab('dashboard');
              }}
              className="py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white border-none rounded-xl font-extrabold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer outline-none"
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
              const message = `✨ *SplitMate Premium Settlement: ${bill.title || 'Untitled Ledger'}* ✨\n\n` +
                `Total to Settle: *Rp ${totalToReceive.toLocaleString('id-ID')}*\n` +
                `━━━━━━━━━━━━━━━━━━━━\n\n` +
                otherTotals.map(p => `💸 *${p.name}*: Rp ${p.total.toLocaleString('id-ID')}`).join('\n') +
                `\n\n━━━━━━━━━━━━━━━━━━━━\n` +
                `🏦 *Transfer to ${payer.name}*\n` +
                `• ${payer.paymentInfo?.bank || 'Bank (TBD)'}: ${payer.paymentInfo?.accountNumber || 'Account (TBD)'}\n\n` +
                `_Join SplitMate to view receipts online!_`;
              const waWindow = window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
              if (!waWindow || waWindow.closed) {
                navigator.clipboard?.writeText(message);
                setToastMsg('WhatsApp blocked. Settlement text copied to clipboard.');
                setTimeout(() => setToastMsg(null), 5000);
              }
            }}
            className="w-full py-3.5 bg-toast-success hover:bg-btn-success-hover text-emerald-450 border border-emerald-950/40 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer outline-none"
          >
            <Icon name="share" className="text-emerald-400 text-sm" />
            Share Settlement via WhatsApp
          </button>
        </div>
      </div>
      {toastMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl text-xs font-bold text-white" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </motion.div>
  );
}

export default memo(Step5Settlement);
