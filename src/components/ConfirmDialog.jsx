import { memo } from 'react';
import Icon from './Icon';
import ModalFrame from './ModalFrame';

export default memo(function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onCancel, variant = 'danger' }) {
  return (
    <ModalFrame open={open} onClose={onCancel} label={title}>
      <div className="panel p-6 sm:p-8 max-w-md w-full shadow-xl">
        <span className="inline-flex p-3 bg-surface-raised rounded-xl mb-5"><Icon name={variant === 'danger' ? 'delete_forever' : 'help'} className="text-2xl text-error" /></span>
        <h2 className="text-2xl font-extrabold tracking-tight">{title}</h2>
        <p className="text-sm text-secondary leading-relaxed mt-3 mb-7">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">{cancelLabel}</button>
          <button onClick={onConfirm} className={variant === 'danger' ? 'btn-primary bg-[#b2343d] text-[#fdfef9] hover:bg-[#972a33]' : 'btn-primary'}>{confirmLabel}</button>
        </div>
      </div>
    </ModalFrame>
  );
});
