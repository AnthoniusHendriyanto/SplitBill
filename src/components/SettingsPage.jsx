import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import { api } from '../lib/api';
import Icon from './Icon';
import { cn } from '../utils/cn';
import AccountTab from './settings/AccountTab';
import SecurityTab from './settings/SecurityTab';
import BillingTab from './settings/BillingTab';
import PageHeader from './ui/PageHeader';

const tabs = [
  { id: 'account', label: 'Account', icon: 'person_outline' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'billing', label: 'Billing', icon: 'credit_card' },
];

function SaveBar({ visible, onSave, onDiscard, saving }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="sticky bottom-0 px-4 pb-4 z-30"
        >
          <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-3 px-4 py-3 rounded-2xl shadow-xl bg-[--surface-elevated] border border-[--border-strong]">
            <div className="w-2.5 h-2.5 rounded-full bg-[--brand-primary]" />
            <span className="text-xs font-bold text-[--text-primary]">Unsaved changes</span>
            <div className="h-4 w-px bg-[--border]" />
            <button onClick={onDiscard} className="px-4 py-2 rounded-xl text-xs font-bold text-[--text-secondary] hover:text-[--text-primary] bg-white/[0.04] hover:bg-white/[0.08] transition-all cursor-pointer border-none outline-none">Discard</button>
            <button onClick={onSave} disabled={saving} className="px-5 py-2 rounded-xl text-xs font-black text-[--text-inverse] bg-[--brand-primary] hover:bg-[--brand-primary-hover] active:scale-95 transition-all cursor-pointer border-none outline-none disabled:opacity-50 shadow-sm">{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SettingsPage() {
  const userObj = useAuthStore((s) => s.user);

  const [settingsTab, setSettingsTab] = useState('account');
  const [tier, setTier] = useState('free');
  const [ocrUsage, setOcrUsage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: userObj?.name || '',
    email: userObj?.email || '',
    phone: '',
    timezone: 'Asia/Jakarta (GMT+7)',
    language: 'English',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [saveFeedbackError, setSaveFeedbackError] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '', twoFactorEnabled: false,
  });

  useEffect(() => {
    let cancelled = false;
    api.getMe().then((data) => {
      if (cancelled) return;
      const user = data.data || data;
      setProfileForm((prev) => ({ ...prev, name: user.name || prev.name, email: user.email || prev.email }));
      setTier(user.tier || 'free');
    }).catch(() => {});
    api.getUsage().then((data) => { if (!cancelled) setOcrUsage(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const showFeedback = (msg, isError = false) => {
    setSaveFeedback(msg);
    setSaveFeedbackError(isError);
    setTimeout(() => { setSaveFeedback(null); setSaveFeedbackError(false); }, 3000);
  };

  const handleSaveSettings = async () => {
    if (!profileForm.name.trim()) { showFeedback('Enter a display name.', true); return; }
    setIsSavingSettings(true);
    try {
      await api.updateMe({ name: profileForm.name });
      useAuthStore.setState({ user: { ...userObj, name: profileForm.name } });
      showFeedback('Settings saved');
      setHasChanges(false);
    } catch (err) {
      showFeedback(err.message || 'Failed to save', true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDiscard = () => {
    setProfileForm({ name: userObj?.name || '', email: userObj?.email || '', phone: '', timezone: 'Asia/Jakarta (GMT+7)', language: 'English' });
    setHasChanges(false);
  };

  const handleUpdatePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) { showFeedback('Passwords do not match', true); return; }
    if (securityForm.newPassword.length < 8) { showFeedback('Password must be at least 8 characters', true); return; }
    setIsSavingSettings(true);
    try {
      await api.updateMe({ password: securityForm.newPassword });
      showFeedback('Password updated');
      setSecurityForm({ ...securityForm, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showFeedback(err.message || 'Failed to update', true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar bg-[--surface-base]">
      <AnimatePresence>
        {saveFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            role="status" aria-live="polite"
            className={cn(
              "fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border text-xs font-semibold",
              saveFeedbackError ? "bg-[--semantic-error-bg] border-[--semantic-error]/30 text-[--semantic-error]" : "bg-[--brand-primary-subtle] border-[--brand-primary]/30 text-[--brand-primary]"
            )}
          >
            <Icon name={saveFeedbackError ? 'close' : 'check'} className="text-sm" />
            <p className="text-xs font-semibold text-[--text-primary]">{saveFeedback}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="page-content page-stack max-w-[1000px]">
        <PageHeader
          eyebrow="Your account"
          title="Your corner."
          description="Account, security, and the plan that fits."
        />

        {/* Tab nav */}
        <div className="segmented" role="group" aria-label="Settings sections">
          {tabs.map((tab) => {
            const isActive = settingsTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setSettingsTab(tab.id)}
                aria-pressed={isActive}
                className="flex items-center justify-center gap-2"
              >
                <Icon name={tab.icon} className="text-lg" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="bg-[--surface-elevated] border border-[--border] rounded-2xl shadow-card overflow-hidden">
          <div className="p-6 md:p-8 space-y-8">
            {settingsTab === 'account' && <AccountTab profileForm={profileForm} setProfileForm={setProfileForm} onHasChanges={() => setHasChanges(true)} tier={tier} />}
            {settingsTab === 'security' && <SecurityTab securityForm={securityForm} setSecurityForm={setSecurityForm} handleUpdatePassword={handleUpdatePassword} saving={isSavingSettings} />}
            {settingsTab === 'billing' && <BillingTab tier={tier} ocrUsage={ocrUsage} />}
          </div>
        </div>
      </div>

      <SaveBar visible={hasChanges && settingsTab !== 'billing'} onSave={handleSaveSettings} onDiscard={handleDiscard} saving={isSavingSettings} />
    </div>
  );
}

export default memo(SettingsPage);
