import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import Icon from '../components/Icon';
import StatusBadge from '../components/ui/StatusBadge';

const money = value => `Rp ${Number(value || 0).toLocaleString('id-ID')}`;

export default function SharedBillPage() {
  const { token } = useParams();
  const [bill, setBill] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSharedBill(token).then(setBill).catch(err => setError(err.message));
  }, [token]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page p-6 text-primary">
        <section className="panel max-w-md p-8 text-center">
          <span className="empty-state-icon mx-auto"><Icon name="link_off" className="text-2xl" /></span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">This share link is unavailable</h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">It may have expired or been revoked by the bill owner.</p>
        </section>
      </main>
    );
  }

  if (!bill) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-page" aria-busy="true" aria-label="Loading shared bill">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
      </main>
    );
  }

  const payer = bill.persons?.find(person => person.is_payer);

  return (
    <main className="min-h-screen bg-page p-5 text-primary sm:p-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="eyebrow">Shared read-only summary</p>
            <h1 className="page-title break-words">{bill.title}</h1>
            <p className="mt-2 text-sm text-secondary">{bill.merchant || 'Shared bill'}{bill.bill_date ? ` · ${bill.bill_date}` : ''}</p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-primary text-[#151714]"><Icon name="receipt_long" className="text-xl" /></span>
        </header>

        <section className="receipt-panel overflow-hidden p-6 sm:p-8" aria-label="Bill total">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-secondary">Grand total</p>
              <p className="mt-2 font-numeric text-4xl font-extrabold tracking-tighter">{money(bill.grand_total)}</p>
            </div>
            {payer && (
              <div className="text-left sm:text-right">
                <p className="text-[11px] font-bold uppercase tracking-wider text-tertiary">Paid by</p>
                <p className="mt-1 font-semibold">{payer.name}</p>
              </div>
            )}
          </div>
        </section>

        <section className="panel overflow-hidden" aria-labelledby="shared-items">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="shared-items" className="font-bold">Items</h2>
            <StatusBadge tone="neutral">{bill.items?.length || 0}</StatusBadge>
          </div>
          {bill.items?.map(item => (
            <div key={item.id} className="data-row mx-5">
              <span className="min-w-0 text-sm">{item.name} <small className="text-secondary">× {item.quantity || 1}</small></span>
              <span className="font-numeric text-sm font-semibold">{money(item.price)}</span>
            </div>
          ))}
        </section>

        <section className="panel overflow-hidden" aria-labelledby="shared-shares">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <h2 id="shared-shares" className="font-bold">Shares</h2>
            <StatusBadge tone="brand">Read only</StatusBadge>
          </div>
          {bill.persons?.map(person => (
            <div key={`${person.name}-${person.share_amount}`} className="data-row mx-5">
              <span className="flex items-center gap-2 text-sm">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-raised text-xs font-bold">{(person.name || '?').charAt(0).toUpperCase()}</span>
                {person.name}
                {person.is_payer && <span className="text-[10px] font-bold uppercase tracking-wider text-brand-primary">Payer</span>}
              </span>
              <span className="font-numeric text-sm font-bold">{money(person.share_amount)}</span>
            </div>
          ))}
        </section>

        <p className="text-center text-xs leading-relaxed text-secondary">Read-only shared summary. No account or payment action is required to view it.</p>
        <p className="pb-4 text-center text-xs font-semibold text-tertiary">Made with splitmate.</p>
      </div>
    </main>
  );
}
