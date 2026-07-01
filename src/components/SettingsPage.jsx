import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import { api } from '../lib/api';
import Icon from './Icon';
import { cn } from '../utils/cn';
import AccountTab from './settings/AccountTab';
import PreferencesTab from './settings/PreferencesTab';
import SplitTab from './settings/SplitTab';
import NotificationsTab from './settings/NotificationsTab';
import BillingTab from './settings/BillingTab';
import SecurityTab from './settings/SecurityTab';
import DangerTab from './settings/DangerTab';
import ConnectionsTab from './settings/ConnectionsTab';

const tabs = [
  { id: 'account', label: 'Account', icon: 'person_outline' },
  { id: 'connections', label: 'Connections', icon: 'people' },
  { id: 'preferences', label: 'Preferences', icon: 'tune' },
  { id: 'split', label: 'Split Rules', icon: 'call_split' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications_none' },
  { id: 'billing', label: 'Billing', icon: 'credit_card' },
  { id: 'security', label: 'Security', icon: 'shield' },
  { id: 'danger', label: 'Danger Zone', icon: 'warning_amber' },
];

function SaveBar({ visible, onSave, onDiscard, saving }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-4 px-5 py-3 rounded-2xl shadow-xl backdrop-blur-xl" style={{ background: 'rgba(17,24,39,0.95)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
            <span className="text-xs font-medium text-[--text-primary]">Unsaved changes</span>
            <div className="h-4 w-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <button onClick={onDiscard} className="px-3 py-1.5 rounded-xl text-xs font-medium text-tertiary hover:text-[--text-primary] transition-all cursor-pointer border-none outline-none" style={{ background: 'rgba(255,255,255,0.04)' }}>
              Discard
            </button>
            <button onClick={onSave} disabled={saving}
              className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer border-none outline-none disabled:opacity-50"
              style={{ background: saving ? 'rgba(124,92,255,0.5)' : 'var(--brand-primary)' }}>
              {saving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function SettingsPage() {
  const navigate = useNavigate();
  const settings = useBillStore((s) => s.settings);
  const updateSettings = useBillStore((s) => s.updateSettings);
  const logout = useAuthStore((s) => s.logout);
  const userObj = useAuthStore((s) => s.user);

  const [settingsTab, setSettingsTab] = useState('account');
  const [tier, setTier] = useState('free');
  const [ocrUsage, setOcrUsage] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: userObj?.name || 'Anton Wijaya',
    email: userObj?.email || 'anton.wijaya@splitmate.id',
    phone: '+62 812-3456-7890',
    timezone: 'Asia/Jakarta (GMT+7)',
    language: 'English',
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [saveFeedbackError, setSaveFeedbackError] = useState(false);
  const [securityForm, setSecurityForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: '', twoFactorEnabled: false,
  });
  const [sessions, setSessions] = useState([
    { id: 1, device: 'Chrome on Windows 11', location: 'Jakarta, Indonesia', active: true, ip: '182.253.140.21' },
    { id: 2, device: 'SplitMate iOS App (iPhone 15 Pro)', location: 'Jakarta, Indonesia', active: false, ip: '182.253.140.22' },
    { id: 3, device: 'Safari on macOS', location: 'Singapore', active: false, ip: '46.137.240.11' },
  ]);

  useEffect(() => {
    let cancelled = false;
    api.getMe()
      .then((data) => {
        if (cancelled) return;
        const user = data.data || data;
        setProfileForm((prev) => ({ ...prev, name: user.name || prev.name, email: user.email || prev.email }));
        setTier(user.tier || 'free');
      }).catch(() => {});

    api.getUsage()
      .then((data) => { if (!cancelled) setOcrUsage(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const showFeedback = (msg, isError = false) => {
    setSaveFeedback(msg);
    setSaveFeedbackError(isError);
    setTimeout(() => { setSaveFeedback(null); setSaveFeedbackError(false); }, 3000);
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await api.updateMe({ name: profileForm.name });
      showFeedback('Settings updated');
      setHasChanges(false);
    } catch (err) {
      showFeedback(err.message || 'Failed to save', true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDiscard = () => {
    setProfileForm({ name: userObj?.name || 'Anton Wijaya', email: userObj?.email || 'anton.wijaya@splitmate.id', phone: '+62 812-3456-7890', timezone: 'Asia/Jakarta (GMT+7)', language: 'English' });
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
      showFeedback(err.message || 'Failed to update password', true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRevokeSession = (id) => setSessions((prev) => prev.filter((s) => s.id !== id));

  return (
    <div className="flex-1 overflow-y-auto hide-scrollbar" style={{ background: 'var(--page-bg)' }}>
      <AnimatePresence>
        {saveFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            role="status" aria-live="polite"
            className="fixed top-20 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-xl flex items-center gap-3"
            style={{ background: saveFeedbackError ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)', border: `1px solid ${saveFeedbackError ? 'rgba(239,68,68,0.2)' : 'rgba(34,197,94,0.2)'}` }}
          >
            <Icon name={saveFeedbackError ? 'close' : 'check'} className={saveFeedbackError ? 'text-error' : 'text-success'} />
            <p className="text-xs font-medium text-[--text-primary]">{saveFeedback}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1040px] mx-auto p-6 md:p-8 space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[--text-primary]">Settings</h1>
          <p className="text-sm text-tertiary mt-1.5">Manage your account, preferences, and billing.</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left nav */}
          <div className="col-span-12 lg:col-span-3">
            <div className="rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
              <div className="p-3 space-y-1">
                {tabs.map((tab) => {
                  const isActive = settingsTab === tab.id;
                  return (
                    <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
                      className={cn(
                        "w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center gap-3 transition-all cursor-pointer border-none outline-none",
                        isActive ? "text-[--brand-primary]" : "text-tertiary hover:text-[--text-primary]"
                      )}
                      style={isActive ? { background: 'rgba(124,92,255,0.12)' } : {}}
                    >
                      {isActive && <div className="w-[3px] h-4 bg-[--brand-primary] rounded-r-full shrink-0" />}
                      {!isActive && <div className="w-[3px] h-4 shrink-0" />}
                      <Icon name={tab.icon} className={cn("text-base", isActive ? "text-[--brand-primary]" : "text-tertiary")} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Premium card */}
            {tier !== 'premium' && (
              <div className="mt-4 rounded-2xl shadow-card overflow-hidden p-5"
                style={{ background: 'linear-gradient(135deg, rgba(124,92,255,0.08), rgba(124,92,255,0.02))', border: '1px solid rgba(124,92,255,0.1)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'rgba(124,92,255,0.15)' }}>
                  <Icon name="workspace_premium" className="text-lg" style={{ color: 'var(--brand-primary)' }} />
                </div>
                <h4 className="text-sm font-bold text-[--text-primary] mb-1">SplitMate Pro</h4>
                <p className="text-xs text-tertiary leading-relaxed mb-4">Unlimited OCR scans, PDF exports, and premium features.</p>
                <button onClick={() => setSettingsTab('billing')}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold text-white transition-all border-none outline-none cursor-pointer"
                  style={{ background: 'var(--brand-primary)' }}>
                  Upgrade
                </button>
              </div>
            )}
          </div>

          {/* Right content */}
          <div className="col-span-12 lg:col-span-9">
            <div className="rounded-2xl shadow-card overflow-hidden" style={{ background: 'var(--surface-elevated)' }}>
              <div className="p-6 md:p-8 space-y-8">
                {settingsTab === 'account' && <AccountTab profileForm={profileForm} setProfileForm={setProfileForm} onHasChanges={() => setHasChanges(true)} />}
                {settingsTab === 'connections' && <ConnectionsTab />}
                {settingsTab === 'preferences' && <PreferencesTab settings={settings} updateSettings={updateSettings} />}
                {settingsTab === 'split' && <SplitTab settings={settings} updateSettings={updateSettings} />}
                {settingsTab === 'notifications' && <NotificationsTab settings={settings} updateSettings={updateSettings} />}
                {settingsTab === 'billing' && <BillingTab tier={tier} ocrUsage={ocrUsage} />}
                {settingsTab === 'security' && <SecurityTab securityForm={securityForm} setSecurityForm={setSecurityForm} handleUpdatePassword={handleUpdatePassword} handleRevokeSession={handleRevokeSession} sessions={sessions} />}
                {settingsTab === 'danger' && <DangerTab setSessions={setSessions} setSaveFeedback={setSaveFeedback} logout={logout} navigate={navigate} />}
              </div>
            </div>
          </div>
        </div>
      </div>

      <SaveBar visible={hasChanges && settingsTab !== 'billing' && settingsTab !== 'danger'} onSave={handleSaveSettings} onDiscard={handleDiscard} saving={isSavingSettings} />
    </div>
  );
}

export default memo(SettingsPage);
