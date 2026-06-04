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

function SettingsPage() {
  const navigate = useNavigate();
  const settings = useBillStore((s) => s.settings);
  const updateSettings = useBillStore((s) => s.updateSettings);
  const logout = useAuthStore((s) => s.logout);
  const userObj = useAuthStore((s) => s.user);

  const [settingsTab, setSettingsTab] = useState('account');
  const [tier, setTier] = useState('free');
  const [ocrUsage, setOcrUsage] = useState(null);
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
        setProfileForm((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
        }));
        setTier(user.tier || 'free');
      })
      .catch(() => {});

    api.getUsage()
      .then((data) => {
        if (!cancelled) setOcrUsage(data);
      })
      .catch(() => {
        if (!cancelled) { setSaveFeedback('Failed to load usage data'); setSaveFeedbackError(true); setTimeout(() => { setSaveFeedback(null); setSaveFeedbackError(false); }, 3000); }
      });

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
      showFeedback('Settings updated successfully!');
    } catch (err) {
      showFeedback(err.message || 'Failed to save settings', true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      showFeedback('New passwords do not match', true);
      return;
    }
    if (securityForm.newPassword.length < 8) {
      showFeedback('Password must be at least 8 characters', true);
      return;
    }
    setIsSavingSettings(true);
    try {
      await api.updateMe({ password: securityForm.newPassword });
      showFeedback('Password updated successfully!');
      setSecurityForm({ ...securityForm, currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      showFeedback(err.message || 'Failed to update password', true);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleRevokeSession = (id) => setSessions((prev) => prev.filter((s) => s.id !== id));

  const tabs = [
    { id: 'account', label: 'Account', icon: 'person_outline' },
    { id: 'preferences', label: 'App Preferences', icon: 'tune' },
    { id: 'split', label: 'Split Preferences', icon: 'call_split' },
    { id: 'notifications', label: 'Notifications', icon: 'notifications_none' },
    { id: 'billing', label: 'Billing & Pro', icon: 'credit_card' },
    { id: 'security', label: 'Security', icon: 'shield' },
    { id: 'danger', label: 'Danger Zone', icon: 'warning_amber' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="max-w-7xl mx-auto w-full p-8 text-slate-200"
    >
      <AnimatePresence>
        {saveFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            role="status" aria-live="polite"
            className={cn("fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md",
              saveFeedbackError ? "bg-toast-error border border-rose-900/60" : "bg-toast-success border border-emerald-900/60"
            )}
          >
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center",
              saveFeedbackError ? "bg-rose-950 text-rose-400" : "bg-emerald-950 text-emerald-400"
            )}>
              <Icon name={saveFeedbackError ? "close" : "check"} className="text-sm font-black" />
            </div>
            <div>
              <p className={cn("text-xs font-black uppercase tracking-wider", saveFeedbackError ? "text-rose-400" : "text-white")}>{saveFeedbackError ? 'Error' : 'Success'}</p>
              <p className="text-[10px] text-slate-400 font-semibold">{saveFeedback}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block"></span>
            System Settings
          </h1>
          <p className="text-slate-500 mt-1.5 text-xs md:text-sm font-semibold">
            Configure your SplitMate platform profile, OCR triggers, split defaults, and billing.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 w-full">
        <div className="col-span-12 lg:col-span-3 space-y-4">
          <div className="bg-card border border-slate-900 rounded-2xl p-4 flex flex-col gap-1.5 relative overflow-hidden shadow-premium">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600/10"></div>
            {tabs.map((tab) => {
              const isActive = settingsTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setSettingsTab(tab.id)}
                  className={cn(
                    "w-full px-4 py-3 rounded-xl text-left text-xs font-extrabold flex items-center gap-3 transition-all cursor-pointer border-none outline-none relative overflow-hidden",
                    isActive ? "bg-indigo-650/30 text-indigo-400 border border-indigo-900/40 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" : "text-slate-500 hover:text-slate-300 hover:bg-slate-950/40 border border-transparent"
                  )}
                >
                  {isActive && <div className="absolute left-0 top-3 w-1 h-6 bg-indigo-500 rounded-full" />}
                  <Icon name={tab.icon} className={cn("text-base", isActive ? "text-indigo-400" : "text-slate-500")} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="bg-gradient-to-br from-card to-card-elevated border border-slate-900 rounded-2xl p-5 relative overflow-hidden shadow-premium text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-950/50 border border-indigo-900/40 flex items-center justify-center text-xl font-black text-indigo-400 mx-auto mb-3 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              {profileForm.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <h4 className="text-xs font-black text-white truncate">{profileForm.name}</h4>
            <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest mt-1">SplitMate {tier === 'premium' ? 'Pro' : 'Free'}</p>
            {tier !== 'premium' && (
              <div className="mt-4 pt-4 border-t border-slate-950">
                <button onClick={() => setSettingsTab('billing')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all border-none outline-none cursor-pointer shadow-md hover:shadow-indigo-600/20"
                >
                  Upgrade to Pro
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <div className="bg-card border border-slate-900 rounded-2xl p-6 relative overflow-hidden shadow-premium min-h-[500px] flex flex-col justify-between">
            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-600/30"></div>

            <div className="flex-1">
              {settingsTab === 'account' && <AccountTab profileForm={profileForm} setProfileForm={setProfileForm} />}
              {settingsTab === 'preferences' && <PreferencesTab settings={settings} updateSettings={updateSettings} />}
              {settingsTab === 'split' && <SplitTab settings={settings} updateSettings={updateSettings} />}
              {settingsTab === 'notifications' && <NotificationsTab settings={settings} updateSettings={updateSettings} />}
              {settingsTab === 'billing' && <BillingTab tier={tier} ocrUsage={ocrUsage} />}
              {settingsTab === 'security' && <SecurityTab securityForm={securityForm} setSecurityForm={setSecurityForm} handleUpdatePassword={handleUpdatePassword} handleRevokeSession={handleRevokeSession} sessions={sessions} />}
              {settingsTab === 'danger' && <DangerTab setSessions={setSessions} setSaveFeedback={setSaveFeedback} logout={logout} navigate={navigate} />}
            </div>

            {settingsTab !== 'billing' && settingsTab !== 'danger' && (
              <div className="mt-8 pt-6 border-t border-slate-950 flex justify-between items-center gap-4">
                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">* Changes will be written to local state & database</span>
                <button onClick={handleSaveSettings} disabled={isSavingSettings}
                  className={cn("px-6 py-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 border-none outline-none cursor-pointer",
                    isSavingSettings ? "bg-slate-900 text-slate-500 cursor-not-allowed" : "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/25 active:scale-98"
                  )}
                >
                  {isSavingSettings ? (
                    <><div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" /> Saving Changes...</>
                  ) : (
                    <>Save Changes <Icon name="check" className="text-xs" /></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(SettingsPage);
