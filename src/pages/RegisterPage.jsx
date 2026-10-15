import { memo, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import Icon from '../components/Icon';
import AuthStory from '../components/AuthStory';
import ThemeToggle from '../components/ThemeToggle';

function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const isRegistering = useAuthStore((s) => s.isRegistering);
  const registerError = useAuthStore((s) => s.registerError);
  const clearErrors = useAuthStore((s) => s.clearErrors);
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const accessToken = useAuthStore((s) => s.accessToken);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
          <div className="flex justify-end mb-6"><ThemeToggle /></div>
          <div className="mb-8">
            <h1 className="page-title">
              You’re invited.
            </h1>
            <p className="text-sm text-secondary mt-3">
              Create an account. Make the next split easy.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reg-name" className="block text-xs font-semibold tracking-wide text-secondary mb-2">
                Name
              </label>
              <div className="relative group">
                <Icon
                  name="person"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-brand-primary transition-colors duration-200 text-lg pointer-events-none"
                />
                <input
                  id="reg-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  minLength={1}
                  maxLength={100}
                  className="w-full h-14 pl-10 pr-4 bg-black/20 border border-white/[0.06] rounded-2xl text-sm font-medium text-primary placeholder:text-tertiary/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-200 hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary),inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none"
                  placeholder="Your name"
                  autoComplete="name"
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email" className="block text-xs font-semibold tracking-wide text-secondary mb-2">
                Email
              </label>
              <div className="relative group">
                <Icon
                  name="mail"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-brand-primary transition-colors duration-200 text-lg pointer-events-none"
                />
                <input
                  id="reg-email"
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
              <label htmlFor="reg-password" className="block text-xs font-semibold tracking-wide text-secondary mb-2">
                Password
              </label>
              <div className="relative group">
                <Icon
                  name="lock"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-brand-primary transition-colors duration-200 text-lg pointer-events-none"
                />
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-14 pl-10 pr-12 bg-black/20 border border-white/[0.06] rounded-2xl text-sm font-medium text-primary placeholder:text-tertiary/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-200 hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary),inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
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

            <div>
              <label htmlFor="reg-confirm-password" className="block text-xs font-semibold tracking-wide text-secondary mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <Icon
                  name="lock"
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-tertiary group-focus-within:text-brand-primary transition-colors duration-200 text-lg pointer-events-none"
                />
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full h-14 pl-10 pr-12 bg-black/20 border border-white/[0.06] rounded-2xl text-sm font-medium text-primary placeholder:text-tertiary/60 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-all duration-200 hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary),inset_0_1px_2px_rgba(0,0,0,0.4)] focus:outline-none"
                  placeholder="Repeat password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-tertiary hover:text-secondary transition-colors duration-200 cursor-pointer"
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                >
                  <Icon name={showConfirmPassword ? 'visibility_off' : 'visibility'} className="text-lg" />
                </button>
              </div>
            </div>

            {displayError && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                role="alert"
                className="flex items-start gap-3 p-3 bg-toast-error border border-error rounded-xl"
              >
                <Icon name="error" className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error font-medium">{displayError}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={isRegistering ? {} : { scale: 1.01 }}
              whileTap={isRegistering ? {} : { scale: 0.98 }}
              type="submit"
              disabled={isRegistering}
              className="w-full h-11 bg-[--brand-primary] hover:bg-[--brand-primary-hover] active:bg-[--brand-primary-active] rounded-xl text-sm font-bold tracking-wide text-[--text-inverse] shadow-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer outline-none"
            >
              {isRegistering ? (
                <>
                  <Icon name="sync" className="animate-spin" />
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

          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-secondary font-medium">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-primary hover:text-brand-primary-hover font-semibold transition-colors">
                Sign in
              </Link>
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}

export default memo(RegisterPage);
