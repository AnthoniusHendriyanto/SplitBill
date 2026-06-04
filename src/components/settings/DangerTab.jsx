import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../Icon';
import ConfirmDialog from '../ConfirmDialog';

function DangerTab({ setSessions, setSaveFeedback, logout, navigate }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase text-rose-500 tracking-widest flex items-center gap-2 mb-1">
          <Icon name="warning_amber" className="text-rose-500 text-base" />
          Danger Zone
        </h3>
        <p className="text-[10px] text-rose-950/80 font-bold uppercase tracking-wider">High risk security credentials. Handle with absolute caution.</p>
      </div>
      <div className="p-6 bg-red-950/10 border border-red-900/30 rounded-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl" />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-red-900/10">
          <div>
            <h4 className="text-xs font-bold text-white">Revoke All Other Sessions</h4>
            <p className="text-[10px] text-slate-500 font-medium">Instantly log out from all devices, browsers, and mobile platforms except this session.</p>
          </div>
          <button onClick={() => { setSessions(prev => prev.filter(s => s.active)); setSaveFeedback('Other device sessions revoked.'); setTimeout(() => setSaveFeedback(null), 3000); }}
            className="w-full sm:w-auto px-4 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer outline-none"
          >
            Revoke Sessions
          </button>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
          <div>
            <h4 className="text-xs font-bold text-rose-400">Permanently Delete Account</h4>
            <p className="text-[10px] text-slate-500 font-medium">Wipe your profile information, payment configuration, scan statistics, and split history forever.</p>
          </div>
          <button onClick={() => setShowDeleteConfirm(true)}
            className="w-full sm:w-auto px-5 py-2.5 bg-rose-950/30 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer outline-none"
          >
            Delete Account
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Account"
        message="CAUTION: Are you absolutely sure you want to permanently delete your SplitMate account? This action is irreversible."
        confirmLabel="Delete Account"
        variant="danger"
        onConfirm={() => { logout(); navigate('/auth'); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </motion.div>
  );
}

export default memo(DangerTab);
