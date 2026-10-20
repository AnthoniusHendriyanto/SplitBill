import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import Icon from '../components/Icon';
import useAuthStore from '../store/useAuthStore';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';

const today = () => new Date().toISOString().slice(0, 10);
const initialForm = () => ({ title: '', amount: '', cadence: 'monthly', next_run: today() });

const formatDate = value => {
  if (!value) return 'Not scheduled';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, { dateStyle: 'medium' });
};

const statusTone = status => status === 'active' ? 'success' : status === 'paused' ? 'warning' : 'neutral';

export default function RecurringPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const user = useAuthStore(s => s.user);

  const load = useCallback(async () => {
    try {
      const data = await api.getRecurrences();
      setItems(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load recurring bills.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.getRecurrences()
      .then(data => { if (active) { setItems(Array.isArray(data) ? data : []); setError(''); } })
      .catch(err => { if (active) setError(err.message || 'Could not load recurring bills.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const create = async event => {
    event.preventDefault();
    if (!form.title.trim()) { setError('Give this recurring bill a name.'); return; }
    if (!(Number(form.amount) > 0)) { setError('Enter an amount greater than zero.'); return; }
    setBusy('create');
    setError('');
    setNotice('');
    try {
      await api.createRecurrence({
        cadence: form.cadence,
        interval: 1,
        next_run: form.next_run,
        template: {
          request_key: crypto.randomUUID(),
          title: form.title.trim(),
          merchant: form.title.trim(),
          items: [{ name: form.title.trim(), price: Number(form.amount), quantity: 1 }],
          persons: [
            { id: 'payer', name: user?.name || 'Me', user_id: user?.id, is_payer: true },
            { id: 'shared', name: 'Shared' },
          ],
          split_type: 'equal',
          assignments: [],
          service_charge: 0,
          service_mode: 'amount',
          tax: 0,
          tax_mode: 'amount',
          discount: 0,
          status: 'pending',
          bill_date: form.next_run,
        },
      });
      setForm(initialForm());
      setNotice('Recurring bill created.');
      await load();
    } catch (err) {
      setError(err.message || 'Could not create this recurring bill.');
    } finally {
      setBusy('');
    }
  };

  const setStatus = async (item, status) => {
    setBusy(item.id);
    setError('');
    setNotice('');
    try {
      await api.setRecurrenceStatus(item.id, status);
      setNotice(status === 'cancelled' ? 'Recurring bill cancelled.' : status === 'paused' ? 'Recurring bill paused.' : 'Recurring bill resumed.');
      setCancelTarget(null);
      await load();
    } catch (err) {
      setError(err.message || 'Could not update this recurring bill.');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-content page-stack">
        <PageHeader
          eyebrow="Set and forget"
          title="Recurring bills"
          description="Generate shared bills on a predictable schedule — rent, subscriptions, or the weekly lunch."
          actions={<span className="chip"><Icon name="event_repeat" className="text-base" />{items.filter(item => item.status === 'active').length} active</span>}
        />

        {error && <p role="alert" className="inline-error"><Icon name="error_outline" className="text-lg" />{error}</p>}
        {notice && <p role="status" className="inline-success"><Icon name="check_circle" className="text-lg" />{notice}</p>}

        <form onSubmit={create} className="section-card">
          <div className="section-heading"><div><h2>New recurring bill</h2><p>A draft is generated automatically on the next run date.</p></div></div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-12">
            <div className="xl:col-span-4">
              <label htmlFor="recurring-title" className="field-label">Bill name</label>
              <input id="recurring-title" required value={form.title} onChange={e => setForm(previous => ({ ...previous, title: e.target.value }))} placeholder="Rent, Netflix, team lunch…" className="field-input" />
            </div>
            <div className="xl:col-span-3">
              <label htmlFor="recurring-amount" className="field-label">Amount (IDR)</label>
              <input id="recurring-amount" required type="number" min="1" step="1" inputMode="numeric" value={form.amount} onChange={e => setForm(previous => ({ ...previous, amount: e.target.value }))} placeholder="500000" className="field-input font-numeric" />
            </div>
            <div className="xl:col-span-2">
              <label htmlFor="recurring-cadence" className="field-label">Repeat</label>
              <select id="recurring-cadence" value={form.cadence} onChange={e => setForm(previous => ({ ...previous, cadence: e.target.value }))} className="field-input">
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div className="xl:col-span-3">
              <label htmlFor="recurring-next-run" className="field-label">First / next run</label>
              <input id="recurring-next-run" required type="date" value={form.next_run} onChange={e => setForm(previous => ({ ...previous, next_run: e.target.value }))} className="field-input" />
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-relaxed text-secondary">Only IDR is supported. Generated bills can be reviewed before they become final.</p>
            <button type="submit" className="btn-primary" disabled={busy === 'create'}>{busy === 'create' ? 'Creating…' : 'Create recurring bill'}<Icon name="add" /></button>
          </div>
        </form>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2" aria-busy="true" aria-label="Loading recurring bills">
            {[1, 2].map(item => <div key={item} className="h-44 animate-pulse rounded-2xl bg-surface-raised" />)}
          </div>
        ) : !items.length ? (
          <div className="panel">
            <EmptyState icon="event_repeat" title="Nothing on repeat yet" description="Create a recurring bill above and it will show up here with its next run date." />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {items.map(item => {
              const amount = Number(item.template?.items?.[0]?.price || 0);
              return (
                <article key={item.id} className="panel flex flex-col justify-between p-5 sm:p-6">
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-bold">{item.template?.title || 'Recurring bill'}</h2>
                        <p className="mt-1 text-sm capitalize text-secondary">{item.cadence} · next {formatDate(item.next_run)}</p>
                      </div>
                      <StatusBadge tone={statusTone(item.status)}>{item.status}</StatusBadge>
                    </div>
                    <p className="mt-5 font-numeric text-2xl font-extrabold tracking-tight">Rp {amount.toLocaleString('id-ID')}</p>
                  </div>

                  {item.status !== 'cancelled' ? (
                    <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                      <button type="button" className="btn-secondary" disabled={busy === item.id} onClick={() => setStatus(item, item.status === 'active' ? 'paused' : 'active')}>
                        <Icon name={item.status === 'active' ? 'pause' : 'play_arrow'} />{item.status === 'active' ? 'Pause' : 'Resume'}
                      </button>
                      <button type="button" className="btn-ghost text-[--semantic-error]" disabled={busy === item.id} onClick={() => setCancelTarget(item)}>
                        <Icon name="cancel" />Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="mt-5 border-t border-border pt-4 text-xs text-secondary">This schedule is cancelled and will not create new bills.</p>
                  )}
                </article>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          open={!!cancelTarget}
          title="Cancel this recurring bill?"
          message="Going forward, no new bills will be generated. Bills that already exist stay in your history."
          confirmLabel="Cancel schedule"
          cancelLabel="Keep it"
          variant="danger"
          onConfirm={() => cancelTarget && setStatus(cancelTarget, 'cancelled')}
          onCancel={() => setCancelTarget(null)}
        />
      </div>
    </div>
  );
}
