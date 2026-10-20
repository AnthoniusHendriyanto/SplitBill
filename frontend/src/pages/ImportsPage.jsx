import { useMemo, useState } from 'react';
import { api } from '../lib/api';
import useAuthStore from '../store/useAuthStore';
import useBillStore from '../store/useBillStore';
import Icon from '../components/Icon';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/ui/StatusBadge';
import { cn } from '../utils/cn';

const normalizeDate = value => {
  if (!value) return new Date().toISOString().slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString().slice(0, 10) : parsed.toISOString().slice(0, 10);
};
const isIdr = row => !row.currency || ['IDR', 'RP'].includes(String(row.currency).toUpperCase());
const steps = [['Upload', 'upload_file'], ['Review', 'fact_check'], ['Result', 'check_circle']];

export default function ImportsPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fileName, setFileName] = useState('');

  const activeStep = message ? 3 : rows.length ? 2 : 1;
  const selectedRows = useMemo(() => selected.map(index => rows[index]).filter(Boolean), [selected, rows]);
  const validRows = useMemo(() => selectedRows.filter(isIdr), [selectedRows]);
  const unsupportedSelected = selectedRows.length - validRows.length;
  const allSelected = rows.length > 0 && selected.length === rows.length;

  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    setMessage('');
    setRows([]);
    setSelected([]);
    try {
      const data = await api.importSplitwise(file);
      const imported = (data.rows || []).map(row => ({ ...row, importKey: crypto.randomUUID() }));
      if (!imported.length) {
        setFileName('');
        setError('No importable rows were found in this CSV.');
        return;
      }
      setFileName(file.name);
      setRows(imported);
      setSelected(imported.map((_, index) => index));
    } catch (err) {
      setError(err.message || 'Could not read this CSV.');
      setFileName('');
    } finally {
      setBusy(false);
    }
  };

  const importDrafts = async () => {
    if (!validRows.length) { setError('Select at least one IDR row.'); return; }
    const user = useAuthStore.getState().user;
    setBusy(true);
    setError('');
    try {
      for (const row of validRows) {
        await api.createBill({
          request_key: row.importKey,
          title: row.description || 'Imported expense',
          merchant: row.description || '',
          category: row.category || 'Other',
          bill_date: normalizeDate(row.date),
          items: [{ id: `${row.importKey}-item`, name: row.description || 'Imported expense', price: row.amount, quantity: 1 }],
          persons: [{ id: 'self', name: user?.name || 'Me', user_id: user?.id, is_payer: true }, { id: 'shared', name: 'Shared' }],
          split_type: 'equal',
          assignments: [],
          service_charge: 0,
          service_mode: 'amount',
          tax: 0,
          tax_mode: 'amount',
          discount: 0,
          status: 'draft',
        });
      }
      await useBillStore.getState().fetchCompletedBills();
      const skipped = unsupportedSelected > 0 ? ` ${unsupportedSelected} non-IDR ${unsupportedSelected === 1 ? 'row was' : 'rows were'} skipped.` : '';
      setMessage(`${validRows.length} draft${validRows.length === 1 ? '' : 's'} imported.${skipped}`);
      setRows([]);
      setSelected([]);
      setFileName('');
    } catch (err) {
      setError(`${err.message || 'Import failed.'} Your imported rows keep their request keys, so retrying will not create duplicates.`);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setRows([]);
    setSelected([]);
    setMessage('');
    setError('');
    setFileName('');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-content page-stack">
        <PageHeader
          eyebrow="Bring your history"
          title="Import expenses"
          description="Preview a Splitwise CSV, choose the rows you want, and turn them into drafts you can finish later."
        />

        <ol className="grid grid-cols-3 gap-2" aria-label="Import progress">
          {steps.map(([label, icon], index) => {
            const state = index + 1 < activeStep ? 'done' : index + 1 === activeStep ? 'current' : 'pending';
            return (
              <li key={label} className={cn(
                'flex min-h-14 items-center gap-2 rounded-xl border px-3 text-sm font-semibold',
                state === 'current' ? 'border-transparent bg-brand-primary text-[#151714]' : state === 'done' ? 'border-border bg-surface-elevated text-primary' : 'border-border bg-surface-base text-tertiary'
              )} aria-current={state === 'current' ? 'step' : undefined}>
                <Icon name={state === 'done' ? 'check' : icon} className="text-lg" />
                <span>{label}</span>
              </li>
            );
          })}
        </ol>

        {error && <p role="alert" className="inline-error"><Icon name="error_outline" className="text-lg" />{error}</p>}

        {activeStep === 1 && (
          <section className="panel p-5 sm:p-8">
            <div className="mx-auto max-w-2xl text-center">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border-strong bg-surface-base p-8 text-center transition-colors hover:border-[--brand-ink] sm:p-12">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-primary text-[#151714]"><Icon name="upload_file" className="text-3xl" /></span>
                <span className="mt-5 text-xl font-extrabold tracking-tight">{busy ? 'Reading your CSV…' : 'Choose a Splitwise CSV'}</span>
                <span className="mt-2 max-w-sm text-sm leading-relaxed text-secondary">Nothing is saved yet. You’ll review every row before creating drafts.</span>
                <span className="btn-secondary mt-6"><Icon name="folder_open" />Select file</span>
                <input type="file" accept=".csv,text/csv" className="sr-only" onChange={upload} disabled={busy} />
              </label>
              <p className="mt-4 text-xs leading-relaxed text-tertiary">Only IDR amounts can be imported. Unsupported currencies are shown in the review step and skipped.</p>
            </div>
          </section>
        )}

        {activeStep === 2 && (
          <section className="panel overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 sm:p-6">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold">Review import</h2>
                  <StatusBadge tone="neutral">{rows.length} rows</StatusBadge>
                  {unsupportedSelected > 0 && <StatusBadge tone="danger">{unsupportedSelected} skipped</StatusBadge>}
                </div>
                <p className="mt-1 truncate text-sm text-secondary">From {fileName || 'your CSV'} · {selected.length} selected</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={reset} disabled={busy}>Start over</button>
                <button type="button" className="btn-primary" onClick={importDrafts} disabled={busy || !validRows.length}>
                  {busy ? 'Importing…' : `Import ${validRows.length || ''} draft${validRows.length === 1 ? '' : 's'}`}
                  <Icon name="download_done" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-tertiary">
                    <th className="w-14 p-4">
                      <input
                        type="checkbox"
                        aria-label="Select all rows"
                        checked={allSelected}
                        onChange={event => setSelected(event.target.checked ? rows.map((_, index) => index) : [])}
                      />
                    </th>
                    <th className="p-4">Date</th>
                    <th className="p-4">Description</th>
                    <th className="p-4 text-right">Amount</th>
                    <th className="p-4">Currency</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, index) => {
                    const unsupported = !isIdr(row);
                    const checked = selected.includes(index);
                    return (
                      <tr key={row.importKey} className={cn('transition-colors hover:bg-surface-raised', unsupported && 'opacity-70')}>
                        <td className="p-4">
                          <input
                            type="checkbox"
                            aria-label={`Select ${row.description || 'imported row'}`}
                            checked={checked}
                            onChange={event => setSelected(current => event.target.checked ? [...current, index] : current.filter(item => item !== index))}
                          />
                        </td>
                        <td className="whitespace-nowrap p-4 text-secondary">{row.date || '—'}</td>
                        <td className="max-w-xs p-4"><span className="line-clamp-2 font-medium">{row.description || 'Imported expense'}</span></td>
                        <td className="p-4 text-right font-numeric font-semibold">{Number(row.amount).toLocaleString('id-ID')}</td>
                        <td className="p-4">
                          {unsupported
                            ? <StatusBadge tone="danger">{row.currency || 'Unknown'} · unsupported</StatusBadge>
                            : <StatusBadge tone="brand">{row.currency || 'IDR'}</StatusBadge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="border-t border-border p-4 text-xs leading-relaxed text-secondary">Drafts are created with a payer and a shared participant. You can edit the split before finalizing.</p>
          </section>
        )}

        {activeStep === 3 && (
          <section className="panel">
            <div className="empty-state py-14">
              <span className="empty-state-icon"><Icon name="task_alt" className="text-2xl" /></span>
              <h2 className="text-xl font-extrabold tracking-tight">Import complete</h2>
              <p className="max-w-md text-sm leading-relaxed text-secondary">{message}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-3">
                <button type="button" className="btn-primary" onClick={() => useBillStore.getState().updateUI({ activeTab: 'history' })}>View history<Icon name="arrow_forward" /></button>
                <button type="button" className="btn-secondary" onClick={reset}>Import another file</button>
              </div>
            </div>
          </section>
        )}

        <section className="panel p-5 sm:p-6">
          <div className="section-heading"><div><h2>Before you import</h2><p>CSV exports from Splitwise are accepted as-is.</p></div></div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ['filter_alt', 'Review first', 'Rows become drafts only after you confirm.'],
              ['payments', 'IDR only', 'Non-IDR rows stay visible but are skipped.'],
              ['fingerprint', 'Safe retries', 'Each row keeps a stable request key to prevent duplicates.'],
            ].map(([icon, title, description]) => (
              <div key={title} className="panel-muted p-4">
                <Icon name={icon} className="text-xl text-brand-primary" />
                <p className="mt-2 text-sm font-bold">{title}</p>
                <p className="mt-1 text-xs leading-relaxed text-secondary">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
