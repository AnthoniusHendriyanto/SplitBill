import { memo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import Icon from '../components/Icon';

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);
  const loginError = useAuthStore((s) => s.loginError);
  const clearErrors = useAuthStore((s) => s.clearErrors);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const accessToken = useAuthStore((s) => s.accessToken);
  const setGuest = useAuthStore((s) => s.setGuest);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

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
    const ok = await login(email, password);
    if (ok) {
      useBillStore.getState().updateUI({ activeTab: 'dashboard', step: 1 });
      navigate('/', { replace: true });
    }
  };

  const handleGuest = () => {
    setGuest();
    useBillStore.getState().updateUI({ activeTab: 'dashboard', step: 1 });
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 font-inter antialiased">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl surface-molded">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 mx-auto mb-4">
              <Icon name="payments" className="text-2xl" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Sign in to your SplitMate account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative group">
              <label htmlFor="login-email" className="absolute -top-2 left-3 px-1 bg-white dark:bg-slate-900 text-[10px] font-bold text-indigo-600 uppercase tracking-wider z-10">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm outline-none dark:text-white"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div className="relative group">
              <label htmlFor="login-password" className="absolute -top-2 left-3 px-1 bg-white dark:bg-slate-900 text-[10px] font-bold text-indigo-600 uppercase tracking-wider z-10">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full px-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-sm outline-none dark:text-white"
                placeholder="Min. 8 characters"
                autoComplete="current-password"
              />
            </div>

            {loginError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
              >
                <Icon name="error" className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">{loginError}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={isLoggingIn ? {} : { scale: 1.01 }}
              whileTap={isLoggingIn ? {} : { scale: 0.99 }}
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 bg-indigo-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500"
            >
              {isLoggingIn ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </>
              ) : (
                <>
                  <Icon name="login" className="text-lg" />
                  Sign In
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold">
                Create one
              </Link>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={handleGuest}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium cursor-pointer"
            >
              <Icon name="person_off" className="text-sm" />
              Continue as guest
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default memo(LoginPage);
