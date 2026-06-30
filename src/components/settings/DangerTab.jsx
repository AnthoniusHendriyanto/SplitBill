import { memo, useState } from 'react';
import ConfirmDialog from '../ConfirmDialog';

function DangerTab({ setSessions, setSaveFeedback, logout, navigate }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h3 className="text-lg font-bold text-[--text-primary] mb-1">Danger Zone</h3>
        <p className="text-sm text-tertiary mb-6">Destructive actions that cannot be undone.</p>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 0 0 1px rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.04)' }}>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[--text-primary]">Revoke All Sessions</p>
              <p className="text-xs text-tertiary mt-0.5">Sign out from all devices except this one.</p>
            </div>
            <button onClick={() => { setSessions(prev => prev.filter(s => s.active)); setSaveFeedback('Sessions revoked.'); }}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[--text-primary] transition-all cursor-pointer border-none outline-none"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              Revoke
            </button>
          </div>
          <div style={{ borderTop: '1px solid rgba(239,68,68,0.1)' }} />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[--text-primary]">Delete Account</p>
              <p className="text-xs text-tertiary mt-0.5">Permanently remove your account and all data.</p>
            </div>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border-none outline-none"
              style={{ color: 'var(--semantic-error)', background: 'rgba(239,68,68,0.08)' }}>
              Delete
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Account"
        message="Are you sure you want to permanently delete your account? This action is irreversible."
        confirmLabel="Delete Account"
        variant="danger"
        onConfirm={() => { logout(); navigate('/auth'); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

export default memo(DangerTab);
