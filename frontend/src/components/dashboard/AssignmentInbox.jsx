import { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export default function AssignmentInbox({ onSelectBill }) {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let pending = false;
    const refresh = async () => {
      if (document.hidden || pending) return;
      pending = true;
      try { const data = await api.getNotifications(page); if (active) { setRows(data); setError(''); } }
      catch (err) { if (active) setError(err.message); }
      finally { pending = false; if (active) setLoading(false); }
    };
    refresh(); const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [page]);
  const open = async row => {
    try { await api.readNotification(row.id); setRows(previous => previous.map(n => n.id === row.id ? { ...n, read_at: new Date().toISOString() } : n)); onSelectBill(row.bill_id); }
    catch (err) { setError(err.message); }
  };
  const unread = rows.filter(n => !n.read_at).length;
  return <section className="panel p-5 sm:p-6" aria-label="Assignment notifications">
    <div className="section-heading">
      <div><h2>Notifications</h2><p>Shares assigned to you by linked friends.</p></div>
      <span className="chip">{unread} unread</span>
    </div>
    {loading && <div role="status" className="space-y-3" aria-label="Loading assignments">{[1, 2].map(item => <div key={item} className="h-12 animate-pulse rounded-xl bg-surface-raised" />)}</div>}
    {error && <p role="alert" className="inline-error">{error}</p>}
    {!loading && !error && !rows.length && <p className="py-4 text-sm text-secondary">No assignments yet. When someone adds you to a bill, it will appear here.</p>}
    {rows.map(n => <button type="button" key={n.id} onClick={() => open(n)} className={`data-row w-full text-left ${n.read_at ? 'text-secondary' : 'text-primary'}`}>
      <span className={`text-sm ${n.read_at ? '' : 'font-semibold'}`}>{n.actor} assigned you a share in {n.title}<span className="mt-1 block text-xs text-secondary">Rp {n.amount.toLocaleString('id-ID')} · {new Date(n.created_at).toLocaleDateString()}</span></span>
      {!n.read_at && <span className="h-2 w-2 rounded-full bg-brand-primary" aria-label="Unread" />}
    </button>)}
    <div className="mt-4 flex items-center justify-between gap-3"><button type="button" className="btn-secondary" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage(p => p - 1); }}>Previous</button><span className="text-sm text-secondary">Page {page}</span><button type="button" className="btn-secondary" disabled={rows.length < 20 || loading} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Next</button></div>
  </section>;
}
