import { useState } from 'react';
import { savedShares } from '../utils/shares';

export default function ShareSummary({ bill }) {
  const [message, setMessage] = useState('');
  const payer = bill.persons?.find(p => p.is_payer);
  const text = `${bill.title}\nTotal: Rp ${Number(bill.grand_total).toLocaleString('id-ID')}\n${savedShares(bill).map(p => `${p.name}: Rp ${p.total.toLocaleString('id-ID')}`).join('\n')}\nPaid by: ${payer?.name || 'See bill'}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: bill.title, text });
      else { await navigator.clipboard.writeText(text); setMessage('Summary copied. Paste into your preferred app.'); }
    } catch (err) { if (err.name !== 'AbortError') setMessage('Sharing unavailable. Select and copy the text below.'); }
  };
  return <section className="panel p-6 space-y-4">
    <h3 className="text-xl font-bold">Saved summary</h3>
    <p className="text-sm text-secondary">Linked participants receive an in-app assignment. Email is queued; delivery may take time. Names and amounts below will be shared.</p>
    <pre className="whitespace-pre-wrap text-sm font-numeric select-text">{text}</pre>
    <div className="flex gap-3 flex-wrap">
      <button type="button" className="btn-primary" onClick={share}>Share / Copy</button>
      <a className="btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
    </div>
    <p className="text-xs text-secondary">Instagram and other apps appear when supported by your device's share sheet.</p>
    <p role="status">{message}</p>
  </section>;
}
