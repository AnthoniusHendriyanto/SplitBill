import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

function Step3People({ receiptGrandTotal, setStep }) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const removePerson = useBillStore((s) => s.removePerson);
  const [participantInput, setParticipantInput] = useState('');

  useEffect(() => {
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || bill.persons.length > 0) return;
    const timer = setTimeout(() => {
      const store = useBillStore.getState();
      const alreadyAdded = store.bill.persons.some(
        p => p.userId === currentUser.id || p.name.toLowerCase() === (currentUser.name || '').toLowerCase()
      );
      if (!alreadyAdded) {
        store.updateBill({
          persons: [{
            id: `user-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            name: currentUser.name || currentUser.email || 'Me',
            userId: currentUser.id,
            isCurrentUser: true,
            paymentInfo: { bank: '', accountNumber: '', qrisData: '' }
          }]
        });
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [bill.persons.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="grid grid-cols-12 gap-8 w-full"
    >
      <div className="col-span-12 lg:col-span-5 bg-card border border-slate-900 rounded-2xl p-6 flex flex-col justify-between min-h-[460px]">
        <div className="space-y-6">
          <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
            Ledger Information
          </h3>
          <div className="relative group">
            <label htmlFor="step3-title" className="absolute -top-2 left-3 px-1 bg-card text-[9px] font-bold text-indigo-400 uppercase tracking-widest z-10">Ledger Title</label>
            <input
              id="step3-title"
              value={bill.title}
              onChange={(e) => updateBill({ title: e.target.value })}
              className="w-full px-4 py-3.5 bg-slate-950/40 border border-slate-900 rounded-xl focus:border-indigo-500 outline-none text-sm font-bold text-white transition-all"
              placeholder="e.g. Dinner at Le Petit Bistro"
            />
          </div>
          <div className="pt-4 border-t border-slate-900">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Select Payer (Who paid the bill?)</span>
            {bill.persons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 hide-scrollbar">
                {bill.persons.map((p) => {
                  const isSelected = bill.payerId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => updateBill({ payerId: p.id })}
                      className={cn(
                        "px-4 py-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between gap-3 cursor-pointer outline-none",
                        isSelected ? "bg-indigo-650/40 border-indigo-500 text-white shadow-lg" : "bg-slate-950/30 border-slate-900 text-slate-400 hover:border-slate-800"
                      )}
                    >
                      <span className="truncate">{p.name || "Unnamed"}</span>
                      {isSelected ? (
                        <Icon name="check_circle" className="text-sm text-indigo-400" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-slate-800" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-600 font-semibold italic text-center py-6">Add participants on the right first to select a payer.</p>
            )}
          </div>
        </div>
        <div className="pt-4 border-t border-slate-900 flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider font-numeric">
          <span>Grand Total Ledger</span>
          <span className="text-white">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span>
        </div>
      </div>
      <div className="col-span-12 lg:col-span-7 bg-card border border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
                Manage People
              </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const mockNames = ["Amelia Cole", "David Chen", "Sofia Rossi"];
                  mockNames.forEach(n => {
                    if (!bill.persons.some(p => p.name.toLowerCase() === n.toLowerCase())) {
                      useBillStore.getState().addPerson(n);
                    }
                  });
                }}
                className="text-[9px] font-extrabold uppercase text-indigo-400 hover:text-indigo-300 transition-colors border border-indigo-900/30 bg-indigo-950/20 px-2.5 py-1 rounded-lg outline-none cursor-pointer"
              >
                Import Contacts
              </button>
            </div>
          </div>
          <div className="flex gap-2 mb-6">
            <label htmlFor="step3-participant" className="sr-only">Participant name</label>
            <input
              id="step3-participant"
              value={participantInput || ''}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && participantInput?.trim()) {
                  useBillStore.getState().addPerson(participantInput.trim());
                  setParticipantInput('');
                }
              }}
              className="flex-1 px-4 py-3 bg-slate-950/40 border border-slate-900 rounded-xl focus:border-indigo-500 outline-none text-xs font-semibold text-white placeholder-slate-700"
              placeholder="Type participant name and press Enter..."
            />
            <button
              onClick={() => {
                if (participantInput?.trim()) {
                  useBillStore.getState().addPerson(participantInput.trim());
                  setParticipantInput('');
                }
              }}
              className="px-4 bg-indigo-650 hover:bg-indigo-600 border border-indigo-600 rounded-xl flex items-center justify-center text-white cursor-pointer outline-none transition-all"
            >
              <Icon name="person_add" className="text-sm" />
            </button>
          </div>
          <div className="min-h-[160px] max-h-[260px] overflow-y-auto rounded-xl border border-slate-950 bg-slate-950/20 p-4">
            {bill.persons.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                <AnimatePresence>
                  {bill.persons.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 bg-card-alt border border-slate-900 rounded-full group transition-all hover:border-slate-800"
                    >
                      <div className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-900 flex items-center justify-center text-[9px] font-bold text-indigo-400 uppercase">
                        {p.name.charAt(0) || "?"}
                      </div>
                      <span className="text-[11px] font-bold text-slate-300 max-w-[120px] truncate">{p.name || "Unnamed"}</span>
                      <button
                        onClick={() => removePerson(p.id)}
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-rose-950 hover:text-rose-400 focus-visible:bg-rose-950 focus-visible:text-rose-400 text-slate-600 border-none transition-colors cursor-pointer outline-none"
                        aria-label="Remove person"
                      >
                        <Icon name="close" className="text-[10px]" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-center py-8">
                <Icon name="people" className="text-3xl text-slate-800 mb-2" />
                <p className="text-[11px] text-slate-600 font-bold leading-relaxed max-w-[200px]">
                  No people added yet. Import or type a name above to start splitting.
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-900 flex justify-between items-center gap-3">
          <button
            onClick={() => {
              const text = encodeURIComponent(`Hey! I'm splitting our bill using SplitMate. Join here: http://splitmate.id/invite/${bill.id || 'new'}`);
              window.open(`https://wa.me/?text=${text}`, '_blank');
            }}
            className="px-4 py-3 bg-toast-success hover:bg-btn-success-hover text-emerald-400 border border-emerald-950/40 rounded-xl font-extrabold text-xs transition-all flex items-center gap-2 cursor-pointer outline-none"
          >
            <Icon name="share" className="text-sm" />
            Invite Link Template
          </button>
          <button
            disabled={bill.persons.length === 0}
            onClick={() => setStep(4)}
            className={cn(
              "px-6 py-3 rounded-xl font-extrabold text-xs shadow-lg transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer",
              bill.persons.length === 0
                ? "bg-slate-900 text-slate-600 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20"
            )}
          >
            Next: Assign Shares
            <Icon name="arrow_forward" className="text-xs" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(Step3People);
