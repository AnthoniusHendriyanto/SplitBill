import { memo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import Icon from '../components/Icon';

function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isRegistering = useAuthStore((s) => s.isRegistering);
  const registerError = useAuthStore((s) => s.registerError);
  const clearErrors = useAuthStore((s) => s.clearErrors);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState(null);

  useEffect(() => {
    clearErrors();
  }, [clearErrors]);

  useEffect(() => {
    if (accessToken && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [accessToken, isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters');
      return;
    }

    const ok = await register(name, email, password);
    if (ok) {
      useBillStore.getState().updateUI({ activeTab: 'dashboard', step: 1 });
      navigate('/', { replace: true });
    }
  };

  const displayError = localError || registerError;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-base flex items-center justify-center p-4 font-inter antialiased">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-surface-elevated border border-slate-200 dark:border-strong rounded-2xl p-8 shadow-xl surface-molded">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mx-auto mb-4">
              <Icon name="payments" className="text-2xl" />
            </div>
            <h1 className="text-2xl font-black text-primary tracking-tight">Create account</h1>
            <p className="text-sm text-tertiary dark:text-secondary mt-1 font-medium">Start splitting bills with SplitMate</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <label htmlFor="reg-name" className="absolute -top-2 left-3 px-1 bg-white dark:bg-surface-elevated text-[10px] font-bold text-indigo-500 uppercase tracking-wider z-10">
                Name
              </label>
              <input
                id="reg-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={1}
                maxLength={100}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-surface-raised/50 border border-slate-200 dark:border-strong rounded-xl focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm outline-none dark:text-white"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div className="relative group">
              <label htmlFor="reg-email" className="absolute -top-2 left-3 px-1 bg-white dark:bg-surface-elevated text-[10px] font-bold text-indigo-500 uppercase tracking-wider z-10">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-4 bg-slate-50 dark:bg-surface-raised/50 border border-slate-200 dark:border-strong rounded-xl focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm outline-none dark:text-white"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="relative group">
              <label htmlFor="reg-password" className="absolute -top-2 left-3 px-1 bg-white dark:bg-surface-elevated text-[10px] font-bold text-indigo-500 uppercase tracking-wider z-10">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-surface-raised/50 border border-slate-200 dark:border-strong rounded-xl focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm outline-none dark:text-white"
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </div>

            <div className="relative group">
              <label htmlFor="reg-confirm-password" className="absolute -top-2 left-3 px-1 bg-white dark:bg-surface-elevated text-[10px] font-bold text-indigo-500 uppercase tracking-wider z-10">
                Confirm Password
              </label>
              <input
                id="reg-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-surface-raised/50 border border-slate-200 dark:border-strong rounded-xl focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm outline-none dark:text-white"
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </div>

            {displayError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
              >
                <Icon name="error" className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">{displayError}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={isRegistering ? {} : { scale: 1.01 }}
              whileTap={isRegistering ? {} : { scale: 0.99 }}
              type="submit"
              disabled={isRegistering}
              className="w-full py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 disabled:from-slate-300 disabled:to-slate-300 dark:disabled:from-slate-700 dark:disabled:to-slate-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:from-indigo-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
            >
              {isRegistering ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                <>
                  <Icon name="person_add" className="text-lg" />
                  Create Account
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-tertiary dark:text-secondary font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
                Sign in
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border dark:border-strong">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-xs text-secondary hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium"
            >
              <Icon name="arrow_back" className="text-sm" />
              Continue as guest
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default memo(RegisterPage);
