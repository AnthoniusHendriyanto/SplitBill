import Icon from '../Icon';

export default function BillingTab({ tier = 'free', ocrUsage }) {
  const hasUsage = Number.isFinite(ocrUsage?.current) && Number.isFinite(ocrUsage?.limit);
  return (
    <div className="space-y-8">
      <div><h2 className="text-2xl font-extrabold tracking-tight">Your plan. At a glance.</h2><p className="text-sm text-secondary mt-2">Subscription and receipt-scanning usage.</p></div>
      <section className="rounded-2xl bg-brand-primary text-[#151714] p-6 sm:p-8">
        <div className="flex justify-between items-center"><span className="text-sm font-semibold">Current plan</span><Icon name="verified" className="text-2xl" /></div>
        <h3 className="text-4xl font-extrabold tracking-tighter my-5">{tier === 'premium' ? 'SplitMate Pro' : 'Free. For your everyday.'}</h3>
        <p className="text-sm border-t-2 border-dashed border-[#151714]/25 pt-5">{tier === 'premium' ? 'Percentage and custom amount splits are included.' : 'Scan receipts. Split equally or by item. Keep track of your bills.'}</p>
      </section>
      <section className="flex flex-col sm:flex-row justify-between gap-4 border-b border-border pb-6">
        <div><h3 className="font-bold">Receipt scans</h3><p className="text-sm text-secondary mt-1">{hasUsage ? 'Usage reported by your account.' : 'Usage information is currently unavailable.'}</p></div>
        <span className="text-2xl font-bold font-numeric">{hasUsage ? `${ocrUsage.current} / ${ocrUsage.limit}` : '—'}</span>
      </section>
      {tier !== 'premium' && <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-5"><div><h3 className="text-lg font-bold">More ways to split.</h3><p className="text-sm text-secondary mt-2 max-w-sm">Pro adds percentage and custom splits. Online upgrades aren’t available yet.</p></div><button disabled className="btn-secondary"><Icon name="lock" className="text-lg" />Coming soon</button></section>}
      <section className="border-t border-border pt-6"><h3 className="font-bold mb-4">Billing history</h3><div className="p-6 rounded-xl bg-surface-base flex gap-3 items-center text-secondary text-sm"><Icon name="receipt_long" className="text-2xl" />{tier === 'premium' ? 'Invoice history is not available yet.' : 'No charges on your free plan.'}</div></section>
    </div>
  );
}
