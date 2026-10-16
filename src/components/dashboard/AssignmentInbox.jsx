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
  return <section className="panel p-6 space-y-4" aria-label="Assignment notifications">
    <h2 className="text-xl font-bold">Notifications <span className="text-sm text-secondary">{rows.filter(n => !n.read_at).length} unread on this page</span></h2>
    {loading && <p role="status">Loading assignments…</p>}
    {error && <p role="alert" className="text-error">{error}</p>}
    {!loading && !error && !rows.length && <p className="text-secondary">No assignments yet.</p>}
    {rows.map(n => <button key={n.id} onClick={() => open(n)} className={`block w-full text-left border-b border-border py-3 ${n.read_at ? 'text-secondary' : 'text-primary font-semibold'}`}>
      {n.actor} assigned you a share in {n.title}<span className="block text-sm">Rp {n.amount.toLocaleString('id-ID')} · {new Date(n.created_at).toLocaleDateString()}</span>
    </button>)}
    <div className="flex gap-3"><button className="btn-secondary" disabled={page === 1 || loading} onClick={() => { setLoading(true); setPage(p => p - 1); }}>Previous</button><span className="self-center">Page {page}</span><button className="btn-secondary" disabled={rows.length < 20 || loading} onClick={() => { setLoading(true); setPage(p => p + 1); }}>Next</button></div>
  </section>;
}
