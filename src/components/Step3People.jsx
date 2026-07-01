import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import { api } from '../lib/api';
import Icon from './Icon';
import { cn } from '../utils/cn';

function Step3People({ receiptGrandTotal, setStep }) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const removePerson = useBillStore((s) => s.removePerson);
  const addPerson = useBillStore((s) => s.addPerson);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const [participantInput, setParticipantInput] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [payerError, setPayerError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoadingContacts(true);
    api.getContacts()
      .then(setContacts)
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, [isAuthenticated]);

  const handleAddPerson = (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    addPerson(trimmed);
    if (isAuthenticated) {
      api.createContact(trimmed).catch(() => {});
    }
    setContacts(prev => prev.some(c => c.name.toLowerCase() === trimmed.toLowerCase())
      ? prev
      : [...prev, { id: 'pending', name: trimmed }]);
  };

  useEffect(() => {
    const store = useBillStore.getState();
    const currentUser = useAuthStore.getState().user;
    if (!currentUser || store.bill.persons.length > 0) return;
    const timer = setTimeout(() => {
      const alreadyAdded = store.bill.persons.some(
        p => p.userId === currentUser.id || p.name.toLowerCase() === (currentUser.name || '').toLowerCase()
      );
      if (!alreadyAdded) {
        store.updateBill({
          persons: [{
            id: crypto.randomUUID(),
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

  useEffect(() => {
    if (bill.persons.length === 1 && bill.payerId !== bill.persons[0].id) {
      updateBill({ payerId: bill.persons[0].id });
    }
  }, [bill.persons.length, bill.payerId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-12 gap-6 w-full"
    >
      {/* Bill Info Panel */}
      <div className="col-span-12 lg:col-span-5 bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 flex flex-col justify-between min-h-[460px] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-primary tracking-wide flex items-center gap-2">
            <span className="w-1 h-4 bg-brand-primary rounded-full inline-block" />
            Bill Details
          </h3>
          <div>
            <label htmlFor="step3-title" className="block text-[10px] font-medium text-secondary tracking-wide mb-1.5">
              Bill Title
            </label>
            <input
              id="step3-title"
              value={bill.title}
              onChange={(e) => updateBill({ title: e.target.value })}
              className="w-full h-11 px-4 bg-black/20 border border-white/[0.06] rounded-2xl text-sm font-medium text-primary placeholder:text-tertiary/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-200 hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary),inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none"
              placeholder="e.g. Dinner at Le Petit Bistro"
            />
          </div>
          <div className="pt-4 border-t border-white/[0.04]">
            <span className="text-[10px] font-medium text-secondary tracking-wide block mb-3">Who paid the bill?</span>
            {bill.persons.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[220px] overflow-y-auto pr-1 hide-scrollbar">
                {bill.persons.map((p) => {
                  const isSelected = bill.payerId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => updateBill({ payerId: p.id })}
                      className={cn(
                        "px-4 py-3 rounded-2xl border text-xs font-medium transition-all flex items-center justify-between gap-3 cursor-pointer outline-none",
                        isSelected
                          ? "border-brand-primary/50 bg-brand-primary/5 text-primary shadow-sm"
                          : "border-white/[0.06] bg-black/20 text-secondary hover:border-white/[0.12]"
                      )}
                    >
                      <span className="truncate">{p.name || "Unnamed"}</span>
                      {isSelected ? (
                        <Icon name="check_circle" className="text-sm text-brand-primary" />
                      ) : (
                        <span className="w-4 h-4 rounded-full border border-white/[0.1]" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-tertiary text-center py-6">Add participants first.</p>
            )}
          </div>
        </div>
        <div className="pt-4 border-t border-white/[0.04] flex justify-between items-center text-[10px] font-medium text-tertiary font-numeric">
          <span>Grand Total</span>
          <span className="text-base font-bold text-primary">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* People Panel */}
      <div className="col-span-12 lg:col-span-7 bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
        <div>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xs font-bold text-primary tracking-wide flex items-center gap-2">
              <span className="w-1 h-4 bg-brand-primary rounded-full inline-block" />
              Participants
            </h3>
          </div>

          <div className="flex gap-2 mb-5">
            <label htmlFor="step3-participant" className="sr-only">Participant name</label>
            <input
              id="step3-participant"
              value={participantInput || ''}
              onChange={(e) => setParticipantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddPerson(participantInput);
                  setParticipantInput('');
                }
              }}
              className="flex-1 h-11 px-4 bg-black/20 border border-white/[0.06] rounded-2xl text-sm font-medium text-primary placeholder:text-tertiary/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-200 hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary),inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none"
              placeholder="Type name and press Enter..."
            />
            <button
              onClick={() => {
                handleAddPerson(participantInput);
                setParticipantInput('');
              }}
              className="w-11 h-11 rounded-2xl bg-gradient-to-r from-brand-primary to-indigo-500 flex items-center justify-center text-white shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all duration-200 cursor-pointer border-none outline-none"
            >
              <Icon name="person_add" className="text-sm" />
            </button>
          </div>

          {/* Saved Contacts — loaded from backend */}
          {isAuthenticated && (
            loadingContacts ? (
              <div className="mb-4 flex gap-2">
                <div className="w-16 h-6 rounded-full bg-white/[0.03] animate-pulse" />
                <div className="w-20 h-6 rounded-full bg-white/[0.03] animate-pulse" />
                <div className="w-14 h-6 rounded-full bg-white/[0.03] animate-pulse" />
              </div>
            ) : contacts.length > 0 && (
              <div className="mb-4">
                <p className="text-[9px] font-medium text-tertiary uppercase tracking-wider mb-2">Contacts</p>
                <div className="flex flex-wrap gap-2">
                  {contacts.map(c => {
                    const inBill = bill.persons.some(p => p.name.toLowerCase() === c.name.toLowerCase());
                    return (
                      <div
                        key={c.id}
                        className="group flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] transition-all hover:border-white/[0.12]"
                      >
                        <div className="w-5 h-5 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-[9px] font-bold text-brand-primary uppercase">
                          {c.name.charAt(0)}
                        </div>
                        <span className="text-[11px] font-medium text-secondary max-w-[80px] truncate">{c.name}</span>
                        {c.connected_user_id && (
                          <span className="text-[8px] px-1 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10 font-medium leading-none shrink-0">
                            connected
                          </span>
                        )}
                        {inBill ? (
                          <span className="w-4 h-4 flex items-center justify-center text-[10px] text-emerald-400">
                            <Icon name="check" />
                          </span>
                        ) : (
                          <button
                            onClick={() => { addPerson(c.name); }}
                            className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-brand-primary/10 text-tertiary hover:text-brand-primary transition-colors cursor-pointer border-none outline-none"
                            aria-label={`Add ${c.name}`}
                          >
                            <Icon name="add" className="text-[10px]" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            api.deleteContact(c.id).catch(() => {});
                            setContacts(prev => prev.filter(x => x.id !== c.id));
                          }}
                          className="w-4 h-4 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-950 hover:text-red-400 text-tertiary transition-all cursor-pointer border-none outline-none"
                          aria-label={`Remove ${c.name}`}
                        >
                          <Icon name="close" className="text-[9px]" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          <div className="min-h-[160px] max-h-[240px] overflow-y-auto rounded-2xl border border-white/[0.04] bg-black/20 p-4 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]">
            {bill.persons.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                <AnimatePresence>
                  {bill.persons.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-full group transition-all hover:border-white/[0.12]"
                    >
                      <div className="w-5 h-5 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-[9px] font-bold text-brand-primary uppercase">
                        {p.name.charAt(0) || "?"}
                      </div>
                      <span className="text-[11px] font-medium text-primary max-w-[120px] truncate">{p.name || "Unnamed"}</span>
                      <button
                        onClick={() => removePerson(p.id)}
                        className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-red-950 hover:text-red-400 text-tertiary border-none transition-colors cursor-pointer outline-none"
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
                <Icon name="people" className="text-3xl text-tertiary mb-2" />
                <p className="text-[11px] text-tertiary font-medium leading-relaxed max-w-[200px]">
                  No people added yet. Type a name above to start splitting.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/[0.04] flex justify-between items-center gap-3">
          <button
            onClick={() => {
              const text = encodeURIComponent(`Hey! I'm splitting our bill using SplitMate. Join here: http://splitmate.id/invite/${bill.id || 'new'}`);
              window.open(`https://wa.me/?text=${text}`, '_blank');
            }}
            className="h-10 px-4 rounded-2xl bg-transparent border border-white/[0.06] hover:bg-white/[0.04] text-tertiary hover:text-secondary text-[10px] font-medium transition-all flex items-center gap-2 cursor-pointer outline-none"
          >
            <Icon name="share" className="text-sm" />
            Share Invite
          </button>
          <div className="flex gap-2.5">
            <button onClick={() => setStep(2)}
              className="h-10 px-4 rounded-2xl bg-transparent border border-white/[0.06] text-secondary hover:text-primary hover:border-white/[0.1] text-[10px] font-medium transition-all flex items-center gap-1.5 cursor-pointer outline-none"
            >
              <Icon name="arrow_back" className="text-xs" /> Back
            </button>
            <button
              disabled={bill.persons.length === 0}
              onClick={() => {
                if (!bill.payerId) {
                  setPayerError('Select who paid the bill to continue.');
                  return;
                }
                setPayerError('');
                setStep(4);
              }}
              className={cn(
                "h-10 px-5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer",
                bill.persons.length === 0
                  ? "bg-white/[0.04] text-tertiary cursor-not-allowed"
                  : "bg-gradient-to-r from-brand-primary to-indigo-500 text-white shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)]"
              )}
            >
              Continue
              <Icon name="arrow_forward" className="text-xs" />
            </button>
            {payerError && (
              <p className="text-[10px] text-red-400 mt-2 text-right">{payerError}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(Step3People);
