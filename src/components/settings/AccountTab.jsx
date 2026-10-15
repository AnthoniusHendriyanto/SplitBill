const inputClass = 'w-full h-12 px-4 bg-surface-base border border-border-strong rounded-xl text-sm text-primary disabled:cursor-not-allowed';
const labelClass = 'text-sm font-medium text-secondary mb-2 block';

export default function AccountTab({ profileForm, setProfileForm, onHasChanges, tier = 'free' }) {
  const initials = (profileForm.name || 'User').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="space-y-8">
      <div><h2 className="text-2xl font-extrabold tracking-tight">Make yourself at home.</h2><p className="text-sm text-secondary mt-2">Your profile and account details.</p></div>
      <div className="flex flex-wrap items-center gap-5 pb-7 border-b border-border">
        <div className="w-20 h-20 rounded-full bg-brand-primary text-[#151714] flex items-center justify-center text-2xl font-extrabold">{initials}</div>
        <div className="min-w-0"><p className="text-xl font-bold break-words">{profileForm.name || 'Your profile'}</p><p className="text-sm text-secondary mt-1 break-all">{profileForm.email}</p><span className="inline-block mt-3 text-xs px-3 py-1 border border-border-strong rounded-full">{tier === 'premium' ? 'Pro plan' : 'Free plan'}</span></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div><label htmlFor="profile-name" className={labelClass}>Display name</label><input id="profile-name" className={inputClass} value={profileForm.name || ''} maxLength={100} onChange={e => { setProfileForm(p => ({ ...p, name: e.target.value })); onHasChanges?.(); }} autoComplete="name" /></div>
        <div><label htmlFor="profile-email" className={labelClass}>Email address</label><input id="profile-email" className={inputClass} value={profileForm.email || ''} readOnly autoComplete="email" /><p className="text-xs text-secondary mt-2">Email changes aren’t available yet.</p></div>
      </div>
      <section className="border-t border-border pt-6">
        <div className="flex flex-wrap justify-between gap-3 mb-2"><h3 className="font-bold">Default transfer details</h3><span className="text-xs border border-border rounded-full px-3 py-1 text-secondary">Coming soon</span></div>
        <p className="text-sm text-secondary mb-5">For now, add bank details on each bill’s settlement screen.</p>
        <fieldset disabled className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <legend className="sr-only">Default transfer details, not yet available</legend>
          <div><label htmlFor="profile-bank" className={labelClass}>Bank / wallet name</label><input id="profile-bank" className={inputClass} placeholder="Bank or wallet" /></div>
          <div><label htmlFor="profile-account" className={labelClass}>Account number</label><input id="profile-account" className={inputClass} placeholder="Account number" /></div>
          <div><label htmlFor="profile-holder" className={labelClass}>Account holder name</label><input id="profile-holder" className={inputClass} placeholder="Name on the account" /></div>
          <div><label htmlFor="profile-qris" className={labelClass}>QRIS payload / ID</label><input id="profile-qris" className={inputClass} placeholder="QRIS ID" /></div>
        </fieldset>
      </section>
    </div>
  );
}
