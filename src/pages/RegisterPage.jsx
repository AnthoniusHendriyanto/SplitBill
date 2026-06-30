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
      className="min-h-screen flex items-center justify-center p-4 font-inter antialiased"
      style={{
        background: `
          radial-gradient(ellipse 600px 400px at 50% 40%, rgba(124,92,255,0.08) 0%, transparent 70%),
          radial-gradient(ellipse 300px 300px at 50% 30%, rgba(99,102,241,0.05) 0%, transparent 100%),
          var(--surface-base)
        `,
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-[500px]"
      >
        <div className="bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-10 shadow-[0_0_0_1px_rgba(255,255,255,0.03)] shadow-xl surface-molded">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-glow ring-1 ring-white/10 mx-auto mb-4">
              <Icon name="payments" className="text-3xl" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-primary">
              Create account
            </h1>
            <p className="text-sm text-secondary mt-1">
              Start splitting bills with SplitMate
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
                  tabIndex={-1}
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
                  tabIndex={-1}
                >
                  <Icon name={showConfirmPassword ? 'visibility_off' : 'visibility'} className="text-lg" />
                </button>
              </div>
            </div>

            {displayError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="flex items-start gap-3 p-3 bg-red-900/15 backdrop-blur-sm border border-red-500/20 rounded-xl"
              >
                <Icon name="error" className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-400 font-medium">{displayError}</p>
              </motion.div>
            )}

            <motion.button
              whileHover={isRegistering ? {} : { scale: 1.01 }}
              whileTap={isRegistering ? {} : { scale: 0.98 }}
              type="submit"
              disabled={isRegistering}
              className="w-full h-14 bg-gradient-to-r from-brand-primary to-indigo-500 rounded-2xl text-base font-semibold tracking-wide text-white shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-brand-primary"
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

          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-tertiary font-medium">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="text-center mb-6">
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
