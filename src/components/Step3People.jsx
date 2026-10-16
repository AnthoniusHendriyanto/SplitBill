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
  const [emailInput, setEmailInput] = useState('');
  const [contacts, setContacts] = useState([]);
  const [loadingContacts, setLoadingContacts] = useState(isAuthenticated);
  const [payerError, setPayerError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) return;
    api.getContacts()
      .then(setContacts)
      .catch(() => {})
      .finally(() => setLoadingContacts(false));
  }, [isAuthenticated]);

  const handleAddPerson = (name) => {
    const friend = contacts.find(c => c.connected_user_id && c.email?.toLowerCase() === emailInput.trim().toLowerCase());
    const trimmed = (friend?.name || name || '').trim();
    if (!trimmed) return;
    if (friend && bill.persons.some(p => p.userId === friend.connected_user_id)) { setPayerError('This friend is already included.'); return; }
    addPerson(friend?.name || trimmed, friend?.email || '', friend?.connected_user_id || '');
    setEmailInput('');
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
        p => p.userId === currentUser.id
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
  }, [bill.persons, bill.payerId, updateBill]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="grid grid-cols-12 gap-6 w-full"
    >
      {/* Bill Info Panel */}
      <div className="col-span-12 lg:col-span-5 receipt-panel p-6 flex flex-col justify-between gap-6">
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-primary tracking-tight">
            Name the occasion.
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
              placeholder="e.g. Friday dinner"
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
                      aria-pressed={isSelected}
                      onClick={() => updateBill({ payerId: p.id })}
                      className={cn(
                        "px-4 py-3 rounded-2xl border text-xs font-medium transition-all flex items-center justify-between gap-3 cursor-pointer outline-none",
                        isSelected
                          ? "border-[--brand-ink] bg-brand-subtle text-primary"
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
        <div className="pt-5 receipt-divider flex flex-wrap gap-2 justify-between items-center text-sm font-medium text-secondary font-numeric">
          <span>Grand Total</span>
          <span className="text-base font-bold text-primary">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span>
        </div>
      </div>

      {/* People Panel */}
      <div className="col-span-12 lg:col-span-7 bg-[--surface-elevated] border border-[--border] rounded-2xl p-6 flex flex-col justify-between shadow-card">
        <div>
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-xl font-bold text-primary tracking-tight">
              The people at the table
            </h3>
            <span className="bg-brand-primary text-[#151714] rounded-full min-w-8 h-8 px-2 flex items-center justify-center font-bold text-sm">{bill.persons.length}</span>
          </div>

          <label htmlFor="friend-email" className="block text-sm text-secondary mb-2">Friend email (optional)</label>
          <input id="friend-email" type="email" value={emailInput} onChange={e => setEmailInput(e.target.value)} className="w-full h-11 px-4 mb-2 bg-surface-base border border-border-strong rounded-xl" placeholder="Find an existing connected friend" />
          <p className="text-xs text-secondary mb-4">{contacts.find(c => c.connected_user_id && c.email?.toLowerCase() === emailInput.trim().toLowerCase())?.name || 'No linked friend selected. Add a name below; no account or email notification is required.'}</p>
          <label htmlFor="step3-participant" className="block text-sm font-medium text-secondary mb-2">Participant name</label>
          <div className="flex gap-2 mb-5">
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
              className="min-w-0 flex-1 h-12 px-4 bg-surface-base border border-border-strong rounded-xl text-sm text-primary"
              placeholder="Type name and press Enter..."
            />
            <button
              aria-label="Add participant"
              onClick={() => {
                handleAddPerson(participantInput);
                setParticipantInput('');
              }}
              className="w-12 h-12 shrink-0 rounded-xl bg-brand-primary hover:bg-brand-hover flex items-center justify-center text-[#151714] transition-colors"
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
                    const inBill = c.connected_user_id && bill.persons.some(p => p.userId === c.connected_user_id);
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
                          <span className="text-[8px] px-1 py-0.5 rounded-full text-[--brand-primary] bg-[--brand-primary-subtle] font-medium leading-none shrink-0">
                            connected
                          </span>
                        )}
                        {inBill ? (
                          <span className="w-4 h-4 flex items-center justify-center text-[10px] text-[--brand-primary]">
                            <Icon name="check" />
                          </span>
                        ) : (
                          <button
                            onClick={() => { addPerson(c.name, c.email || '', c.connected_user_id || ''); }}
                            className="icon-button"
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
                          className="icon-button hover:text-error"
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

          <div className="min-h-[160px] max-h-[320px] overflow-y-auto border-t border-border py-5">
            {bill.persons.length > 0 ? (
              <div className="flex flex-wrap gap-2.5">
                <AnimatePresence>
                  {bill.persons.map((p) => (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex items-center gap-3 pl-2 pr-1 py-1 bg-brand-subtle border border-border-strong rounded-full"
                    >
                      <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center text-base font-bold text-[#151714] uppercase">
                        {p.name.charAt(0) || "?"}
                      </div>
                      <span className="text-sm font-semibold text-primary max-w-[120px] truncate">{p.name || "Unnamed"}</span>
                      {p.userId && <span className="text-xs text-secondary">Linked</span>}
                      <button
                        onClick={() => removePerson(p.id)}
                        className="icon-button hover:text-error"
                        aria-label={`Remove ${p.name}`}
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

        <div className="mt-6 pt-5 border-t border-border">
          <div className="flex gap-2.5 justify-between flex-wrap">
            <button onClick={() => setStep(2)}
              className="h-10 px-4 rounded-2xl bg-transparent border border-white/[0.06] text-secondary hover:text-primary hover:border-white/[0.1] text-[10px] font-medium transition-all flex items-center gap-1.5 cursor-pointer outline-none"
            >
              <Icon name="arrow_back" className="text-xs" /> Back
            </button>
            <button
              disabled={bill.persons.length < 2 || !bill.title.trim()}
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
                  : "bg-[--brand-primary] hover:bg-[--brand-primary-hover] active:scale-[0.98] text-[--text-inverse] shadow-sm"
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
