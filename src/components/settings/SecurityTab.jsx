import Icon from '../Icon';

export default function SecurityTab({ securityForm, setSecurityForm, handleUpdatePassword, saving }) {
  return (
    <div className="space-y-8">
      <div><h2 className="text-2xl font-extrabold tracking-tight">Keep it yours.</h2><p className="text-sm text-secondary mt-2">Manage your password and account security.</p></div>
      <form onSubmit={e => { e.preventDefault(); handleUpdatePassword(); }} className="space-y-5">
        <h3 className="text-lg font-bold">Change password</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[['newPassword', 'New password'], ['confirmPassword', 'Confirm password']].map(([key, label]) => (
            <div key={key}><label htmlFor={key} className="text-sm font-medium text-secondary mb-2 block">{label}</label><input id={key} type="password" autoComplete="new-password" required minLength={8} value={securityForm[key] || ''} onChange={e => setSecurityForm({ ...securityForm, [key]: e.target.value })} className="w-full h-12 px-4 bg-surface-base border border-border-strong rounded-xl text-sm" /></div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-xs text-secondary">Use at least 8 characters.</p><button disabled={saving} aria-busy={saving} type="submit" className="btn-primary">{saving ? 'Updating…' : 'Update Password'}</button></div>
      </form>
      <div className="border-t border-border">
        {[
          ['shield', 'Two-factor authentication', 'Authenticator support is not available yet.'],
          ['devices', 'Active sessions', 'Device history and remote sign-out are not available yet.'],
          ['download', 'Export data', 'Full account exports are not available yet.'],
          ['person_remove', 'Delete account', 'Account deletion is not available in the app yet.'],
        ].map(([icon, title, description]) => <section key={title} className="py-6 border-b border-border last:border-0 flex items-start gap-4"><span className="w-11 h-11 shrink-0 rounded-xl bg-surface-raised flex items-center justify-center"><Icon name={icon} className="text-xl" /></span><div className="flex-1"><h3 className="font-semibold text-sm">{title}</h3><p className="text-sm text-secondary mt-1">{description}</p></div></section>)}
      </div>
    </div>
  );
}
