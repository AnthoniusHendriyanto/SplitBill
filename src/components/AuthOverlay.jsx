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
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl text-center">
          <div className="w-14 h-14 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="lock" className="text-2xl text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">
            Sign In to Split Bills
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 leading-relaxed">
            Create an account or sign in to upload receipts, scan with AI OCR, and split bills with friends.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl transition-all cursor-pointer"
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}