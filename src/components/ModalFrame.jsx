import { useEffect, useRef } from 'react';

export default function ModalFrame({ open = true, onClose, label, children, drawer = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    // ponytail: native dialog owns focus trapping, inert background, and focus restoration.
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);
  return (
    <dialog ref={ref} className={`modal-layer${drawer ? ' drawer' : ''}`} aria-label={label}
      onCancel={e => { e.preventDefault(); e.stopPropagation(); onClose(); }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {open && children}
    </dialog>
  );
}
