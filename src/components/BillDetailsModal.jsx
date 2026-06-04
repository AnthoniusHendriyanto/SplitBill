import { memo, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import ConfirmDialog from './ConfirmDialog';
import { cn } from '../utils/cn';

function BillDetailsModal({ billId, onClose }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const completedBills = useBillStore((s) => s.completedBills);
  const togglePersonPaid = useBillStore((s) => s.togglePersonPaid);
  const deleteCompletedBill = useBillStore((s) => s.deleteCompletedBill);
  const loadBillDraft = useBillStore((s) => s.loadBillDraft);
  const updateUI = useBillStore((s) => s.updateUI);
  const bill = completedBills.find(b => b.id === billId);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!bill) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={bill.title}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-inter text-slate-800 dark:text-slate-200"
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{bill.title}</h3>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Completed on {new Date(bill.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/50 rounded-xl p-6 flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</p>
              <p className="text-3xl font-black text-indigo-600 mt-1">Rp {bill.grandTotal.toLocaleString('id-ID')}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</p>
              <span className={cn(
                "inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mt-2",
                bill.status === 'completed'
                  ? "bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-400"
                  : bill.status === 'draft'
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
              )}>
                {bill.status}
              </span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">People & Payment Status</h4>
            <div className="space-y-3">
              {bill.persons?.length > 0 ? (
                bill.persons.map((person) => (
                  <div
                    key={person.id}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-gray-100 dark:border-gray-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
                        {person.name?.charAt(0)?.toUpperCase() || 'P'}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{person.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => togglePersonPaid(bill.id, person.id)}
                        className={cn(
                          "px-4 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer",
                          person.paid
                            ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
                            : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-gray-200 dark:border-gray-700 hover:bg-slate-50"
                        )}
                      >
                        {person.paid ? 'Paid' : 'Mark Paid'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-xs italic">No participants registered in this ledger.</p>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between gap-4">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-2.5 rounded-xl border border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-all cursor-pointer"
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
              className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-indigo-500/20"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit Draft & Resume
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-950 text-white font-bold text-sm hover:bg-slate-800 transition-all cursor-pointer"
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
