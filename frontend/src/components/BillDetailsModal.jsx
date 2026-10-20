import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import ConfirmDialog from './ConfirmDialog';
import Icon from './Icon';
import { api } from '../lib/api';
import ModalFrame from './ModalFrame';
import { savedShares } from '../utils/shares';
import ShareSummary from './ShareSummary';
import StatusBadge from './ui/StatusBadge';

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
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);

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
            serverData: billData,
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

  const beginEdit = () => {
    setEditForm({
      title: bill.title,
      merchant: bill.merchant,
      bill_date: bill.billDate,
      items: bill.items.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity || 1 })),
    });
    setEditing(true);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    setSavingEdit(true);
    try {
      const source = bill.serverData;
      const payload = {
        request_key: crypto.randomUUID(), title: editForm.title, merchant: editForm.merchant, category: source.category || 'Other', bill_date: editForm.bill_date,
        items: editForm.items, persons: (source.persons || []).map(person => ({ id: person.id, name: person.name, email: person.email || '', user_id: person.user_id || undefined, custom_amount: person.custom_amount || 0, is_payer: person.is_payer, percentage: person.percentage || 0, payment_info: person.payment_info || {} })),
        split_type: source.split_type, assignments: (source.items || []).flatMap(item => (item.assigned_person_ids || []).map(person_id => ({ item_id: item.id, person_id }))),
        service_charge: source.service_charge || 0, service_mode: source.service_mode || 'amount', tax: source.tax || 0, tax_mode: source.tax_mode || 'amount', discount: source.discount || 0, status: source.status,
      };
      const updated = await api.updateBill(bill.id, payload);
      const next = updated.bill || updated;
      setBill(prev => prev ? { ...prev, serverData: next, title: next.title, merchant: next.merchant || '', billDate: next.bill_date || '', items: next.items || [], persons: next.persons || [], payments: next.payments || [], grandTotal: next.grand_total, status: next.status, totals: savedShares(next) } : prev);
      setEditing(false);
      fetchCompletedBills();
      fetchDebts();
    } catch (err) { setError(err.message || 'Could not update this bill.'); }
    finally { setSavingEdit(false); }
  };

  if (loading || !bill) return <ModalFrame onClose={onClose} label="Bill details"><div className="panel p-8 w-full max-w-xl"><h2 className="text-xl font-bold mb-5">Bill details</h2>{loading ? <div aria-busy="true" aria-label="Loading bill" className="space-y-4"><div className="h-24 bg-surface-raised rounded-xl animate-pulse" /><div className="h-32 bg-surface-raised rounded-xl animate-pulse" /></div> : <p role="alert" className="text-error">{error || 'This bill is unavailable.'}</p>}<button className="btn-secondary mt-6" onClick={onClose}>Close</button></div></ModalFrame>;

  const editLocked = Object.values(bill.personPaid || {}).some(Boolean);

  return (
    <ModalFrame onClose={onClose} label={bill.title || 'Bill details'}>
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="print-area receipt-panel w-full max-w-2xl shadow-xl overflow-hidden flex flex-col max-h-[90dvh] text-primary"
      >
        <div className="flex items-start justify-between gap-4 border-b border-border bg-surface-base p-5 sm:p-6">
          <div className="min-w-0">
            <p className="eyebrow mb-1">Bill details</p>
            <h2 className="text-2xl font-extrabold tracking-tight text-primary break-words">{bill.title}</h2>
            {bill.merchant && <p className="mt-0.5 text-xs font-medium text-tertiary">{bill.merchant}</p>}
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-secondary">
              {bill.billDate && <span>Bill date: {new Date(bill.billDate + 'T00:00:00').toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>}
              <span>Created: {new Date(bill.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close bill details"
            className="icon-button print-hide"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
         <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
           {error && <p role="alert" className="inline-error print-hide">{error}</p>}
           {editing && <form onSubmit={saveEdit} className="print-hide bg-surface-base border border-border rounded-xl p-5 space-y-4"><div className="flex justify-between items-center"><h3 className="font-bold">Edit bill</h3><button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button></div><label className="field-label">Title<input className="field-input mt-1" value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} required /></label><label className="field-label">Merchant<input className="field-input mt-1" value={editForm.merchant} onChange={e => setEditForm(p => ({ ...p, merchant: e.target.value }))} /></label><label className="field-label">Bill date<input type="date" className="field-input mt-1" value={editForm.bill_date} onChange={e => setEditForm(p => ({ ...p, bill_date: e.target.value }))} required /></label><div><p className="field-label">Items</p>{editForm.items.map((item, index) => <div key={item.id} className="mb-2 grid grid-cols-[1fr_7rem_4rem] gap-2"><input aria-label={`Item ${index + 1} name`} className="field-input" value={item.name} onChange={e => setEditForm(p => ({ ...p, items: p.items.map((row, i) => i === index ? { ...row, name: e.target.value } : row) }))} required /><input aria-label={`Item ${index + 1} price`} type="number" min="0" className="field-input font-numeric" value={item.price} onChange={e => setEditForm(p => ({ ...p, items: p.items.map((row, i) => i === index ? { ...row, price: Number(e.target.value) } : row) }))} required /><input aria-label={`Item ${index + 1} quantity`} type="number" min="1" className="field-input font-numeric" value={item.quantity} onChange={e => setEditForm(p => ({ ...p, items: p.items.map((row, i) => i === index ? { ...row, quantity: Number(e.target.value) } : row) }))} required /></div>)}</div><button className="btn-primary" type="submit" disabled={savingEdit}>{savingEdit ? 'Saving…' : 'Save changes'}</button></form>}
          <div className="bg-surface-base border border-border rounded-xl p-5 sm:p-6">
            <div className="flex flex-wrap gap-4 justify-between items-start">
              <div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Grand Total</p>
                <p className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-primary mt-2 font-numeric">Rp {(bill.grandTotal || 0).toLocaleString('id-ID')}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest">Status</p>
                <StatusBadge tone={bill.status === 'completed' ? 'success' : bill.status === 'draft' ? 'neutral' : 'warning'} className="mt-2">
                  {bill.status}
                </StatusBadge>
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
                              className="print-hide px-4 py-2 rounded-xl bg-[--brand-primary] hover:bg-[--brand-primary-hover] text-[--text-inverse] font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm disabled:opacity-50 active:scale-[0.98]"
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
          {bill.ownerId === userId && editLocked && bill.status !== 'draft' && (
            <p className="print-hide rounded-xl border border-border bg-surface-base p-3 text-xs leading-relaxed text-secondary">
              Editing is locked because a payment has already been marked paid. Delete the bill only if you need to rebuild it.
            </p>
          )}
          {bill.status !== 'draft' && <ShareSummary bill={bill.serverData} />}
        </div>
        <div className="print-hide flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface-base p-4 sm:p-6">
          <div>
            {bill.ownerId === userId && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="btn-danger"
              >
                <Icon name="delete" className="text-base" />Delete bill
              </button>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {bill.ownerId === userId && bill.status !== 'draft' && !editLocked && (
              <button type="button" className="btn-secondary" onClick={beginEdit}><Icon name="edit" className="text-base" />Edit bill</button>
            )}
            {bill.status === 'draft' && bill.ownerId === userId ? (
              <button
                type="button"
                onClick={async () => {
                  try { await loadBillDraft(bill.id); updateUI({ step: 4, activeTab: 'bills' }); onClose(); }
                  catch (err) { setError(err.message); }
                }}
                className="btn-primary"
              >
                <Icon name="edit" className="text-base" />Resume as copy
              </button>
            ) : (
              <button type="button" onClick={onClose} className="btn-secondary">Close</button>
            )}
          </div>
          <ConfirmDialog
            open={showDeleteConfirm}
            title="Delete bill history"
            message="Are you absolutely sure you want to delete this bill history? This cannot be undone."
            confirmLabel="Delete"
            variant="danger"
            onConfirm={async () => { try { await deleteCompletedBill(bill.id); onClose(); } catch (err) { setError(err.message); } }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </div>
      </motion.div>
    </ModalFrame>
  );
}

export default memo(BillDetailsModal);
