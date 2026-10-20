import { memo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import Icon from '../components/Icon';
import AuthStory from '../components/AuthStory';
import ThemeToggle from '../components/ThemeToggle';

function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);
  const loginError = useAuthStore((s) => s.loginError);
  const clearErrors = useAuthStore((s) => s.clearErrors);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

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

  return (
    <div
      className="auth-layout"
      style={{
        background: `var(--surface-base)`,
      }}
    >
      <AuthStory />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="auth-form"
      >
        <div>
          <div className="flex justify-end mb-8"><ThemeToggle /></div>
          <div className="mb-8">
            <h1 className="page-title">
              Back for more?
            </h1>
            <p className="text-sm text-secondary mt-3">
              Sign in to pick up where you left off.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold tracking-wide text-secondary mb-2">
                Email
              </label>
              <div className="relative group">
                <Icon
                  name="mail"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-brand-primary transition-colors duration-200 text-lg pointer-events-none"
                />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full h-14 pl-10 pr-4 bg-black/20 border border-white/[0.06] rounded-2xl text-sm font-medium text-primary placeholder:text-tertiary/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-200 hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary),inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold tracking-wide text-secondary mb-2">
                Password
              </label>
              <div className="relative group">
                <Icon
                  name="lock"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-brand-primary transition-colors duration-200 text-lg pointer-events-none"
                />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-14 pl-10 pr-12 bg-black/20 border border-white/[0.06] rounded-2xl text-sm font-medium text-primary placeholder:text-tertiary/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-200 hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary),inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none"
                  placeholder="Min. 8 characters"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary transition-colors duration-200 cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-lg" />
                </button>
              </div>
            </div>

            {loginError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                role="alert"
                className="flex items-start gap-3 p-3 bg-toast-error border border-error rounded-xl"
              >
                <Icon name="error" className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error font-medium">{loginError}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={isLoggingIn ? {} : { scale: 1.01 }}
              whileTap={isLoggingIn ? {} : { scale: 0.98 }}
              type="submit"
              disabled={isLoggingIn}
              className="w-full h-11 bg-[--brand-primary] hover:bg-[--brand-primary-hover] active:bg-[--brand-primary-active] rounded-xl text-sm font-bold tracking-wide text-[--text-inverse] shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer outline-none"
            >
              {isLoggingIn ? (
                <>
                  <Icon name="sync" className="animate-spin" />
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

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-secondary font-medium">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-brand-primary hover:text-brand-primary-hover font-semibold transition-colors">
                Create one
              </Link>
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

export default memo(LoginPage);
