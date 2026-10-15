import Icon from './Icon';

export default function AuthStory() {
  return (
    <aside className="auth-story" aria-label="About SplitMate">
      <div className="flex items-center gap-3 text-2xl font-extrabold tracking-tighter"><Icon name="payments" className="text-3xl" /> splitmate.</div>
      <div>
        <h2>Less math.<br />More memories.</h2>
        <p className="text-base max-w-xs leading-relaxed">Dinner, a weekend away, or just coffee. Split the bill. Keep the good times.</p>
      </div>
      <div className="auth-story-detail mt-12 border-t-2 border-dashed border-[#151714]/30 pt-5 flex items-center justify-between gap-4">
        <span className="text-sm font-semibold">One receipt. Everyone’s share.</span>
        <Icon name="call_split" className="text-5xl -rotate-90" />
      </div>
    </aside>
  );
}
