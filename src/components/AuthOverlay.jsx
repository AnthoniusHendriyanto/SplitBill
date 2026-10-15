import { useNavigate } from 'react-router-dom';
import Icon from './Icon';

export default function AuthOverlay({ children }) {
  const navigate = useNavigate();

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10" role="dialog" aria-modal="true" aria-label="Sign in required">
        <div className="bg-[--surface-elevated] border border-[--border] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-xl text-center">
          <div className="w-14 h-14 bg-[--brand-primary-subtle] rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="lock" className="text-2xl text-[--brand-primary]" />
          </div>
          <h3 className="text-lg font-black text-primary mb-2">
            Sign In to Split Bills
          </h3>
          <p className="text-sm text-tertiary dark:text-secondary font-medium mb-6 leading-relaxed">
            Create an account or sign in to upload receipts, scan with AI OCR, and split bills with friends.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-[--brand-primary] hover:bg-[--brand-primary-hover] text-[--text-inverse] font-bold rounded-xl transition-all cursor-pointer shadow-sm active:scale-[0.98]"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 bg-white dark:bg-surface-raised border border-slate-200 dark:border-strong hover:bg-slate-50 dark:hover:bg-slate-700 text-tertiary dark:text-primary font-bold rounded-xl transition-all cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}