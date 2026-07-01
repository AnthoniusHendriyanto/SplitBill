import { memo, useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import ConfirmDialog from './ConfirmDialog';
import { cn } from '../utils/cn';
import { api } from '../lib/api';

function BillDetailsModal({ billId, onClose }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [markingPaid, setMarkingPaid] = useState({});
  const deleteCompletedBill = useBillStore((s) => s.deleteCompletedBill);
  const loadBillDraft = useBillStore((s) => s.loadBillDraft);
  const fetchCompletedBills = useBillStore((s) => s.fetchCompletedBills);
  const updateUI = useBillStore((s) => s.updateUI);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const modalRef = useRef(null);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated && billId) {
      api.getBill(billId)
        .then(data => {
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
            tax: billData.tax,
            discount: billData.discount || 0,
            status: billData.status || 'pending',
            assignments: {},
            totals: (() => {
              const lineTotal = (item) => item.price * (item.quantity || 1);
              const totalAmount = items.reduce((sum, item) => sum + lineTotal(item), 0);

              const svcAmount = billData.service_mode === 'percent'
                ? totalAmount * (billData.service_charge || 0) / 100
                : (billData.service_charge || 0);
              const taxAmount = billData.tax_mode === 'percent'
                ? totalAmount * (billData.tax || 0) / 100
                : (billData.tax || 0);

              return persons.map(p => {
                let subtotal = 0;
                items.forEach(item => {
                  const assigned = item.assigned_to || [];
                  if (assigned.length === 0) {
                    subtotal += lineTotal(item) / persons.length;
                  } else if (assigned.includes(p.name)) {
                    subtotal += lineTotal(item) / assigned.length;
                  }
                });

                const ratio = totalAmount > 0 ? subtotal / totalAmount : 0;
                const serviceShare = svcAmount * ratio;
                const taxShare = taxAmount * ratio;

                return {
                  id: p.id, name: p.name,
                  subtotal,
                  tax: taxShare,
                  service: serviceShare,
                  total: subtotal + serviceShare + taxShare,
                };
              });
            })(),
          });
        })
        .catch(err => console.error('Failed to fetch bill:', err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [billId, isAuthenticated]);

  useEffect(() => {
    const previousFocus = document.activeElement;
    const modal = modalRef.current;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && modal) {
        const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };
  }, [onClose]);

  if (loading) return null;
  if (!bill) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={bill.title}>
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-surface-elevated/90 backdrop-blur-xl border border-white/[0.04] rounded-3xl w-full max-w-2xl shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col max-h-[90vh] font-inter text-primary"
      >
        <div className="p-6 border-b border-white/[0.04] flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-primary">{bill.title}</h3>
            {bill.merchant && <p className="text-xs text-tertiary font-medium mt-0.5">{bill.merchant}</p>}
            <div className="flex gap-3 mt-1 text-xs text-secondary font-medium">
              {bill.billDate && <span>Bill Date: {new Date(bill.billDate + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>}
              <span>Created: {new Date(bill.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-tertiary cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-xl p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Grand Total</p>
                <p className="text-3xl font-black text-brand-primary mt-1">Rp {bill.grandTotal.toLocaleString('id-ID')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Status</p>
                <span className={cn(
                  "inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mt-2",
                  bill.status === 'completed'
                    ? "bg-green-900/30 text-green-400"
                    : bill.status === 'draft'
                      ? "bg-indigo-900/30 text-indigo-400"
                      : "bg-amber-900/30 text-amber-400"
                )}>
                  {bill.status}
                </span>
              </div>
            </div>
            <div className="flex gap-6 mt-4 pt-4 border-t border-white/[0.04] text-xs">
              <div>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Subtotal</p>
                <p className="font-semibold text-primary mt-0.5">Rp {(bill.totals?.length ? bill.totals.reduce((s, t) => s + t.subtotal, 0) : 0).toLocaleString('id-ID')}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Tax & Service</p>
                <p className="font-semibold text-primary mt-0.5">Rp {(bill.totals?.length ? bill.totals.reduce((s, t) => s + (t.tax || 0) + (t.service || 0), 0) : 0).toLocaleString('id-ID')}</p>
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
            <h4 className="text-xs font-bold text-secondary uppercase tracking-widest mb-4">People & Payment Status</h4>
            <div className="space-y-3">
              {bill.persons?.length > 0 ? (
                bill.persons.map((person) => {
                  const pt = bill.totals?.find(t => t.id === person.id);
                  const total = pt?.total || 0;
                  const isPayer = person.id === bill.payerId;
                  return (
                    <div
                      key={person.id}
                      className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white text-xs font-bold">
                          {person.name?.charAt(0)?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary">
                            {person.name}
                            {isPayer && <span className="text-[10px] font-bold text-emerald-400 ml-2 uppercase tracking-wider">Payer</span>}
                          </p>
                          <p className="text-xs text-tertiary mt-0.5">
                            Rp {total.toLocaleString('id-ID')}
                          </p>
                          {(() => {
                            if (!pt) return null;
                            const parts = [];
                            if (pt.subtotal > 0) parts.push(`Subtotal Rp${pt.subtotal.toLocaleString('id-ID')}`);
                            if (pt.service > 0) parts.push(`Service Charge Rp${pt.service.toLocaleString('id-ID')}`);
                            if (pt.tax > 0) parts.push(`Tax Rp${pt.tax.toLocaleString('id-ID')}`);
                            if (parts.length === 0) return null;
                            return <p className="text-xs text-secondary mt-0.5">{parts.join(' · ')}</p>;
                          })()}
                        </div>
                      </div>
                      {bill.status === 'pending' && !isPayer && (
                        bill.personPaid?.[person.id]
                          ? <span className="text-xs font-bold text-green-400 flex items-center gap-1"><span className="material-symbols-outlined text-sm">check_circle</span> Paid</span>
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
                                } catch (e) {
                                  console.error('Failed to mark person paid:', e);
                                } finally {
                                  setMarkingPaid(prev => ({ ...prev, [person.id]: false }));
                                }
                              }}
                              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold text-xs hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] transition-all cursor-pointer flex items-center gap-1.5 shadow-xl shadow-emerald-500/20 disabled:opacity-50"
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
        <div className="p-6 border-t border-white/[0.04] bg-black/20 flex justify-between gap-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-2.5 rounded-xl border border-red-500/20 text-red-400 font-bold text-sm hover:bg-red-500/10 transition-all cursor-pointer"
          >
            Delete History
          </button>
          <ConfirmDialog
            open={showDeleteConfirm}
            title="Delete Bill History"
            message="Are you absolutely sure you want to delete this bill history?"
            confirmLabel="Delete"
            variant="danger"
            onConfirm={() => { deleteCompletedBill(bill.id); onClose(); }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
          {bill.status === 'draft' ? (
            <button
                onClick={() => {
                loadBillDraft(bill.id);
                updateUI({ step: 4, activeTab: 'bills' });
                onClose();
              }}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-primary to-indigo-500 text-white font-bold text-sm hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all cursor-pointer flex items-center gap-1.5 shadow-xl shadow-brand-primary/20"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit Draft & Resume
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
    </div>
  );
}

export default memo(BillDetailsModal);
