import { useState } from 'react';
import { savedShares } from '../utils/shares';
import { api } from '../lib/api';
import Icon from './Icon';

export default function ShareSummary({ bill }) {
  const [message, setMessage] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const payer = bill.persons?.find(p => p.is_payer);
  const text = `${bill.title}\nTotal: Rp ${Number(bill.grand_total).toLocaleString('id-ID')}\n${savedShares(bill).map(p => `${p.name}: Rp ${p.total.toLocaleString('id-ID')}`).join('\n')}\nPaid by: ${payer?.name || 'See bill'}`;

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: bill.title, text });
      else { await navigator.clipboard.writeText(text); setMessage('Summary copied. Paste it wherever you like.'); }
    } catch (err) {
      if (err.name !== 'AbortError') setMessage('Sharing is unavailable. Select and copy the text below.');
    }
  };

  const createLink = async () => {
    setCreatingLink(true);
    try {
      const result = await api.createShare(bill.id);
      const link = `${window.location.origin}/shared/${result.token}`;
      setShareLink(link);
      await navigator.clipboard?.writeText(link);
      setMessage('Read-only share link copied. It expires in 7 days.');
    } catch (err) {
      setMessage(err.message || 'Could not create share link.');
    } finally {
      setCreatingLink(false);
    }
  };

  const revokeLink = async () => {
    try {
      await api.revokeShare(bill.id);
      setShareLink('');
      setMessage('Share link revoked.');
    } catch (err) {
      setMessage(err.message || 'Could not revoke share link.');
    }
  };

  const download = (content, filename, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const slug = (bill.title || 'splitbill').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const exportJson = () => download(JSON.stringify({ title: bill.title, bill_date: bill.bill_date, grand_total: bill.grand_total, shares: savedShares(bill) }, null, 2), `${slug}.json`, 'application/json');
  const exportCsv = () => {
    const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [['Name', 'Share (IDR)', 'Payer'], ...savedShares(bill).map(person => [person.name, person.total, person.is_payer ? 'Yes' : 'No'])];
    download(`\ufeff${rows.map(row => row.map(quote).join(',')).join('\n')}`, `${slug}.csv`, 'text/csv;charset=utf-8');
  };

  return (
    <section className="space-y-4 border-t border-border pt-5" aria-labelledby="share-heading">
      <div className="section-heading">
        <div>
          <h3 id="share-heading" className="text-xl font-bold">Share & export</h3>
          <p>A private link, a message, or a file — your call.</p>
        </div>
      </div>

      <pre className="whitespace-pre-wrap rounded-xl border border-border bg-surface-base p-4 text-sm font-numeric select-text">{text}</pre>

      <div className="print-hide space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={share}><Icon name="share" className="text-base" />Share / copy</button>
          <a className="btn-secondary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer"><Icon name="chat" className="text-base" />WhatsApp</a>
          {!shareLink
            ? <button type="button" className="btn-secondary" onClick={createLink} disabled={creatingLink}><Icon name="link" className="text-base" />{creatingLink ? 'Creating…' : 'Read-only link'}</button>
            : <button type="button" className="btn-secondary" onClick={() => { navigator.clipboard?.writeText(shareLink); setMessage('Read-only share link copied.'); }}><Icon name="content_copy" className="text-base" />Copy link</button>}
          {shareLink && <button type="button" className="btn-danger" onClick={revokeLink}><Icon name="link_off" className="text-base" />Revoke</button>}
        </div>

        <div>
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-tertiary">Export</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-secondary" onClick={exportCsv}><Icon name="table_view" className="text-base" />CSV</button>
            <button type="button" className="btn-secondary" onClick={exportJson}><Icon name="data_object" className="text-base" />JSON</button>
            <button type="button" className="btn-secondary" onClick={() => window.print()}><Icon name="print" className="text-base" />Print</button>
          </div>
        </div>
      </div>

      {shareLink && <p className="print-hide break-all text-xs text-tertiary">{shareLink}</p>}
      <p className="print-hide text-xs leading-relaxed text-secondary">Linked participants receive an in-app assignment. Names and amounts shown above are shared; no account identifiers are included.</p>
      <p role="status" className="print-hide text-xs font-semibold text-secondary">{message}</p>
    </section>
  );
}
