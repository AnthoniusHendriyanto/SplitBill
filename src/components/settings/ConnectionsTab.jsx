import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../../lib/api';
import Icon from '../Icon';

const inputClass = "w-full h-12 px-4 rounded-2xl text-sm font-medium text-[--text-primary] placeholder-tertiary outline-none transition-all duration-200 focus:ring-1 focus:ring-[--brand-primary] focus:ring-opacity-50";

export default function ConnectionsTab() {
  const [contacts, setContacts] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    api.getContacts().then(setContacts).catch(() => {});
    api.getInvitations().then(setInvitations).catch(() => {});
  }, []);

  const sendInvite = async () => {
    if (!inviteEmail.trim()) return;
    setSending(true);
    try {
      await api.sendInvitation(inviteEmail.trim());
      setFeedback({ ok: true, msg: 'Invitation sent!' });
      setInviteEmail('');
      api.getInvitations().then(setInvitations).catch(() => {});
    } catch (err) {
      setFeedback({ ok: false, msg: err.message });
    }
    setSending(false);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleAccept = async (id) => {
    try {
      await api.acceptInvitation(id);
      setFeedback({ ok: true, msg: 'Invitation accepted! They are now connected.' });
      api.getInvitations().then(setInvitations).catch(() => {});
      api.getContacts().then(setContacts).catch(() => {});
    } catch (err) {
      setFeedback({ ok: false, msg: err.message });
    }
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleReject = async (id) => {
    try {
      await api.rejectInvitation(id);
      api.getInvitations().then(setInvitations).catch(() => {});
    } catch {}
  };

  const received = invitations.filter(inv => inv.status === 'pending' && inv.from_user && inv.to_email === inv.from_user.email);
  const sent = invitations.filter(inv => inv.from_user && inv.to_email !== inv.from_user.email);

  return (
    <div className="space-y-8 animate-fade-in">
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`px-4 py-3 rounded-2xl text-xs font-medium ${feedback.ok ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'}`}
        >
          {feedback.msg}
        </motion.div>
      )}

      {/* Invite by email */}
      <div>
        <h3 className="text-lg font-bold text-[--text-primary] mb-1">Invite a Friend</h3>
        <p className="text-sm text-tertiary mb-4">Send an invitation by email. When they accept, you'll be connected as contacts.</p>
        <div className="flex gap-3">
          <input
            className={inputClass}
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendInvite()}
            placeholder="friend@email.com"
            type="email"
          />
          <button
            onClick={sendInvite}
            disabled={sending || !inviteEmail.trim()}
            className="px-5 py-2.5 rounded-2xl text-xs font-semibold text-white transition-all border-none outline-none cursor-pointer disabled:opacity-50 shrink-0"
            style={{ background: 'var(--brand-primary)' }}
          >
            {sending ? 'Sending...' : 'Send Invite'}
          </button>
        </div>
      </div>

      {/* Received invitations */}
      {received.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[--text-primary] mb-3">Pending Invitations</h4>
          <div className="space-y-2">
            <AnimatePresence>
              {received.map(inv => (
                <motion.div
                  key={inv.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-xs font-bold text-brand-primary uppercase">
                      {inv.from_user.name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[--text-primary]">{inv.from_user.name}</p>
                      <p className="text-[10px] text-tertiary">{inv.from_user.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAccept(inv.id)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-semibold text-white border-none outline-none cursor-pointer"
                      style={{ background: 'var(--brand-primary)' }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(inv.id)}
                      className="px-3 py-1.5 rounded-xl text-[10px] font-medium text-tertiary border-none outline-none cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.06)' }}
                    >
                      Reject
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Sent invitations */}
      {sent.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-[--text-primary] mb-3">Sent Invitations</h4>
          <div className="space-y-2">
            {sent.map(inv => (
              <div
                key={inv.id}
                className="flex items-center justify-between px-4 py-3 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
                    <Icon name="mail_outline" className="text-xs text-tertiary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[--text-primary]">{inv.to_email}</p>
                    <p className="text-[10px] text-tertiary capitalize">{inv.status}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  inv.status === 'accepted' ? 'text-emerald-400 bg-emerald-500/10' :
                  inv.status === 'rejected' ? 'text-red-400 bg-red-500/10' :
                  'text-amber-400 bg-amber-500/10'
                }`}>
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connected contacts */}
      <div>
        <h4 className="text-sm font-semibold text-[--text-primary] mb-3">
          Connected Contacts ({contacts.length})
        </h4>
        {contacts.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {contacts.map(c => (
              <div
                key={c.id}
                className="flex items-center gap-2 pl-2 pr-1.5 py-1.5 rounded-full"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="w-6 h-6 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-[9px] font-bold text-brand-primary uppercase">
                  {c.name.charAt(0)}
                </div>
                <span className="text-xs font-medium text-[--text-primary]">{c.name}</span>
                {c.connected_user_id && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full text-emerald-400 bg-emerald-500/10 font-medium">
                    connected
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-tertiary">No contacts yet. Invite someone to get started.</p>
        )}
      </div>
    </div>
  );
}
