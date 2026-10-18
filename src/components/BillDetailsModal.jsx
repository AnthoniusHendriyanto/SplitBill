import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import ConfirmDialog from './ConfirmDialog';
import { cn } from '../utils/cn';
import { api } from '../lib/api';
import ModalFrame from './ModalFrame';
import { savedShares } from '../utils/shares';

function BillDetailsModal({ billId, onClose }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [markingPaid, setMarkingPaid] = useState({});
  const deleteCompletedBill = useBillStore((s) => s.deleteCompletedBill);
  const loadBillDraft = useBillStore((s) => s.loadBillDraft);
  const fetchCompletedBills = useBillStore((s) => s.fetchCompletedBills);
  const fetchDebts = useBillStore((s) => s.fetchDebts);
  const updateUI = useBillStore((s) => s.updateUI);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const userId = useAuthStore(s => s.user?.id);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(() => isAuthenticated && !!billId);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    if (isAuthenticated && billId) {
      api.getBill(billId)
        .then(data => {
          if (cancelled) return;
          const billData = data.bill || data;
          const persons = billData.persons || [];
          const items = billData.items || [];
          const payments = billData.payments || [];
          const payer = persons.find(p => p.is_payer);

          const personPaid = {};
          persons.forEach(p => {
            const personPayments = payments.filter(pm => pm.from_person_id === p.id);
            personPaid[p.id] = personPayments.length > 0 && personPayments.every(pm => pm.is_paid);
          });

          setBill({
            id: billData.id,
            ownerId: billData.user_id,
            title: billData.title,
            merchant: billData.merchant || '',
            billDate: billData.bill_date || '',
            completedAt: billData.created_at,
            grandTotal: billData.grand_total,
            items,
            persons,
            payments,
            personPaid,
            payerId: payer?.id || null,
            serviceCharge: billData.service_charge,
            subtotal: billData.total_amount,
            fees: (billData.service_mode === 'percent' ? billData.total_amount * billData.service_charge / 100 : billData.service_charge) + (billData.tax_mode === 'percent' ? billData.total_amount * billData.tax / 100 : billData.tax),
            tax: billData.tax,
            discount: billData.discount || 0,
            status: billData.status || 'pending',
            assignments: {},
            totals: savedShares(billData),
          });
        })
        .catch(err => { if (!cancelled) setError(err.message || 'Could not load this bill. Please try again.'); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [billId, isAuthenticated, userId]);

  if (loading || !bill) return <ModalFrame onClose={onClose} label="Bill details"><div className="panel p-8 w-full max-w-xl"><h2 className="text-xl font-bold mb-5">Bill details</h2>{loading ? <div aria-busy="true" aria-label="Loading bill" className="space-y-4"><div className="h-24 bg-surface-raised rounded-xl animate-pulse" /><div className="h-32 bg-surface-raised rounded-xl animate-pulse" /></div> : <p role="alert" className="text-error">{error || 'This bill is unavailable.'}</p>}<button className="btn-secondary mt-6" onClick={onClose}>Close</button></div></ModalFrame>;

  return (
    <ModalFrame onClose={onClose} label={bill.title || 'Bill details'}>
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="receipt-panel w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90dvh] text-primary"
      >
        <div className="p-6 border-b border-white/[0.04] flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-primary break-words">{bill.title}</h2>
            {bill.merchant && <p className="text-xs text-tertiary font-medium mt-0.5">{bill.merchant}</p>}
            <div className="flex flex-wrap gap-2 mt-2 text-xs text-secondary font-medium">
              {bill.billDate && <span>Bill Date: {new Date(bill.billDate + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>}
              <span>Created: {new Date(bill.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close bill details"
            className="icon-button"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && <p role="alert" className="text-error text-sm">{error}</p>}
          <div className="bg-surface-base border border-border rounded-xl p-5 sm:p-6">
            <div className="flex flex-wrap gap-4 justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Grand Total</p>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-primary mt-2 font-numeric">Rp {(bill.grandTotal || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Status</p>
                <span className={cn(
                  "inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mt-2",
                  bill.status === 'completed'
                    ? "bg-[--brand-primary-subtle] text-[--brand-primary]"
                    : bill.status === 'draft'
                      ? "bg-surface-raised text-secondary"
                      : "bg-[--semantic-warning-bg] text-warning"
                )}>
                  {bill.status}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 mt-5 pt-5 receipt-divider text-sm">
              <div>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Subtotal</p>
                <p className="font-semibold text-primary mt-0.5">Rp {bill.subtotal.toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Tax & Service</p>
                <p className="font-semibold text-primary mt-0.5">Rp {bill.fees.toLocaleString('id-ID')}</p>
              </div>
            </div>
            {bill.discount > 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                <span className="w-1 h-1 rounded-full bg-amber-400/60" />
                <span className="text-[9px] font-medium text-amber-400/80 uppercase tracking-wider">You saved</span>
                <span className="text-xs font-bold text-amber-400">Rp {bill.discount.toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold tracking-tight text-primary mb-4">Who’s settled up?</h3>
            <div className="space-y-3">
              {bill.persons?.length > 0 ? (
                bill.persons.map((person) => {
                  const pt = bill.totals?.find(t => t.id === person.id);
                  const total = pt?.total;
                  const isPayer = person.id === bill.payerId;
                  return (
                    <div
                      key={person.id}
                      className="flex flex-wrap items-center justify-between gap-4 py-5 border-b border-border last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 shrink-0 rounded-full bg-brand-primary flex items-center justify-center text-[#151714] text-sm font-bold">
                          {person.name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary">
                            {person.name}
                            {isPayer && <span className="text-[10px] font-bold text-[--brand-primary] ml-2 uppercase tracking-wider">Payer</span>}
                          </p>
                          <p className="text-xs text-tertiary mt-0.5">
                            {total == null ? 'Not finalized' : `Rp ${total.toLocaleString('id-ID')}`}
                          </p>
                        </div>
                      </div>
                      {bill.ownerId === userId && bill.status === 'pending' && !isPayer && total > 0 && (
                        bill.personPaid?.[person.id]
                          ? <span className="text-xs font-bold text-[--brand-primary] flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span> Paid</span>
                          : <button
                              disabled={markingPaid[person.id]}
                              onClick={async () => {
                                setMarkingPaid(prev => ({ ...prev, [person.id]: true }));
                                try {
                                  const resp = await api.markPersonPaid(bill.id, person.id);
                                  setBill(prev => prev ? {
                                    ...prev,
                                    personPaid: { ...prev.personPaid, [person.id]: true },
                                    status: resp.completed ? 'completed' : prev.status,
                                  } : prev);
                                   fetchCompletedBills();
                                   fetchDebts();
                                } catch (e) {
                                  setError(e.message || 'Could not mark this payment as paid. Try again.');
                                } finally {
                                  setMarkingPaid(prev => ({ ...prev, [person.id]: false }));
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-[--brand-primary] hover:bg-[--brand-primary-hover] text-[--text-inverse] font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-[0.98]"
                            >
                              <span className="material-symbols-outlined text-sm">check_circle</span>
                              {markingPaid[person.id] ? 'Marking...' : 'Mark Paid'}
                            </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="text-secondary text-xs italic">No participants registered in this ledger.</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6 receipt-divider bg-surface-base flex flex-wrap justify-between gap-3">
          {bill.ownerId === userId && <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-2.5 rounded-xl border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-all cursor-pointer"
          >
            Delete Bill
          </button>}
          <ConfirmDialog
            open={showDeleteConfirm}
            title="Delete Bill History"
            message="Are you absolutely sure you want to delete this bill history?"
            confirmLabel="Delete"
            variant="danger"
            onConfirm={async () => {
              setShowDeleteConfirm(false);
              try { await deleteCompletedBill(bill.id); onClose(); }
              catch (err) { setError(err.message); }
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
          {bill.status === 'draft' && bill.ownerId === userId ? (
            <button
                onClick={async () => {
                try {
                  await loadBillDraft(bill.id);
                  updateUI({ step: 4, activeTab: 'bills' });
                  onClose();
                } catch (err) { setError(err.message); }
              }}
              className="px-6 py-2.5 rounded-xl bg-[--brand-primary] hover:bg-[--brand-primary-hover] text-[--text-inverse] font-bold text-sm transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Resume as Copy
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-white/[0.04] text-secondary font-bold text-sm hover:text-primary hover:bg-white/[0.08] transition-all cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </motion.div>
    </ModalFrame>
  );
}

export default memo(BillDetailsModal);
