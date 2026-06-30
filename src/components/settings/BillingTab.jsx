import Icon from '../Icon';

export default function BillingTab({ tier, ocrUsage }) {
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-[--text-primary] mb-1">Billing</h3>
        <p className="text-sm text-tertiary mb-6">Manage your subscription and usage limits.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium text-tertiary mb-2">Current Plan</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold text-[--text-primary]">{tier === 'premium' ? 'Pro' : 'Free'}</span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md" style={{ background: 'rgba(124,92,255,0.1)', color: 'var(--brand-primary)' }}>Active</span>
          </div>
          <p className="text-xs text-tertiary">{tier === 'premium' ? 'Rp 39.000 / month' : 'Rp 0 / month'}</p>
        </div>

        <div className="p-5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', boxShadow: '0 0 0 1px rgba(255,255,255,0.06)' }}>
          <p className="text-xs font-medium text-tertiary mb-2">OCR Scans</p>
          <div className="flex items-end justify-between mb-3">
            <span className="text-2xl font-bold text-[--text-primary] tabular-nums">
              {tier === 'premium' ? '\u221E' : (ocrUsage?.current ?? 0)}
              {tier !== 'premium' && <span className="text-sm font-medium text-tertiary"> / {ocrUsage?.limit ?? 10}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            <div className="h-full rounded-full" style={{ width: tier === 'premium' ? '100%' : `${ocrUsage ? Math.min((ocrUsage.current / (ocrUsage.limit || 1)) * 100, 100) : 0}%`, background: 'var(--brand-primary)' }} />
          </div>
        </div>
      </div>

      {/* Upgrade card */}
      {tier !== 'premium' && (
        <div className="p-6 rounded-2xl relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.08), transparent)', boxShadow: '0 0 0 1px rgba(124,92,255,0.1)' }}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10" style={{ background: 'var(--brand-primary)', filter: 'blur(60px)' }} />
          <h4 className="text-base font-bold text-[--text-primary] mb-2">Upgrade to Pro</h4>
          <p className="text-sm text-tertiary mb-4 max-w-md">Unlimited OCR scans, PDF exports, and premium features for Rp 39.000/month.</p>
          <ul className="space-y-2 text-xs text-[--text-primary] mb-6">
            <li className="flex items-center gap-2"><Icon name="check" className="text-sm" style={{ color: 'var(--brand-primary)' }} /> Unlimited OCR receipt scanning</li>
            <li className="flex items-center gap-2"><Icon name="check" className="text-sm" style={{ color: 'var(--brand-primary)' }} /> PDF and Excel export</li>
            <li className="flex items-center gap-2"><Icon name="check" className="text-sm" style={{ color: 'var(--brand-primary)' }} /> Priority support</li>
          </ul>
          <button className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all border-none outline-none cursor-pointer"
            style={{ background: 'var(--brand-primary)' }}>
            Get Pro — Rp 39.000/mo
          </button>
        </div>
      )}
    </div>
  );
}
