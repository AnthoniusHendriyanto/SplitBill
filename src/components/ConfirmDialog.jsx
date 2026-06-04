import { memo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import { cn } from '../utils/cn';

function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => confirmRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative bg-card border border-slate-800 rounded-2xl p-6 shadow-2xl max-w-sm w-full mx-4"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center",
                variant === 'danger' ? "bg-red-950/40 text-red-400" : "bg-amber-950/40 text-amber-400"
              )}>
                <Icon name={variant === 'danger' ? 'delete_forever' : 'warning'} className="text-lg" />
              </div>
              <h2 id="confirm-dialog-title" className="text-sm font-bold text-white">{title}</h2>
            </div>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">{message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition-all border-none outline-none cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmRef}
                onClick={onConfirm}
                className={cn(
                  "px-4 py-2 font-bold text-xs rounded-xl transition-all border-none outline-none cursor-pointer",
                  variant === 'danger'
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-indigo-600 hover:bg-indigo-500 text-white"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default memo(ConfirmDialog);
