import { memo, useMemo, useEffect, useState } from 'react';
import useBillStore from '../../store/useBillStore';
import useAuthStore from '../../store/useAuthStore';
import Icon from '../Icon';
import ActivityFeed from './ActivityFeed';
import AssignmentInbox from './AssignmentInbox';
import PageHeader from '../ui/PageHeader';
import { api } from '../../lib/api';

const money = amount => `Rp ${Math.abs(Number(amount) || 0).toLocaleString('id-ID')}`;
const compactMoney = amount => {
  const value = Number(amount) || 0;
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toFixed(1).replace('.0', '')}jt`;
  if (value >= 1_000) return `Rp ${Math.round(value / 1_000)}rb`;
  return money(value);
};
const monthLabel = key => {
  const date = new Date(`${key}-01T12:00:00`);
  return Number.isNaN(date.getTime()) ? key : date.toLocaleDateString(undefined, { month: 'short' });
};

export default memo(function Dashboard({ setActiveTab, setStep, setSelectedBillId }) {
  const bills = useBillStore(s => s.completedBills);
  const isLoading = useBillStore(s => s.isLoadingBills);
  const error = useBillStore(s => s.billsError);
  const debts = useBillStore(s => s.debts);
  const balanceLoading = useBillStore(s => s.isLoadingDebts);
  const balanceError = useBillStore(s => s.debtsError);
  const fetchDebts = useBillStore(s => s.fetchDebts);
  const user = useAuthStore(s => s.user);
  const [settlements, setSettlements] = useState([]);
  const [settlementsError, setSettlementsError] = useState('');
  const [settlementsLoading, setSettlementsLoading] = useState(true);

  const safeDebts = useMemo(() => Array.isArray(debts) ? debts : [], [debts]);
  const metrics = useMemo(() => safeDebts.reduce((sum, debt) => ({
    receivable: sum.receivable + (debt.direction === 'receivable' ? Number(debt.amount) || 0 : 0),
    payable: sum.payable + (debt.direction === 'payable' ? Number(debt.amount) || 0 : 0),
  }), { receivable: 0, payable: 0 }), [safeDebts]);

  useEffect(() => {
    let pending = false;
    const refresh = () => {
      if (document.hidden || pending) return;
      pending = true;
      fetchDebts().finally(() => { pending = false; });
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [fetchDebts]);

  useEffect(() => {
    let active = true;
    setSettlementsLoading(true);
    setSettlementsError('');
    api.getSettlements()
      .then(data => { if (active) setSettlements(Array.isArray(data) ? data : []); })
      .catch(err => { if (active) { setSettlements([]); setSettlementsError(err.message || 'Unavailable'); } })
      .finally(() => { if (active) setSettlementsLoading(false); });
    return () => { active = false; };
  }, [debts]);

  const savedBills = useMemo(() => bills.filter(bill => bill.status !== 'draft'), [bills]);
  const recent = useMemo(() => [...savedBills].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0)).slice(0, 5), [savedBills]);
  const categoryTotals = useMemo(() => Object.entries(savedBills.reduce((result, bill) => {
    const key = bill.category || 'Other';
    result[key] = (result[key] || 0) + Number(bill.grandTotal || 0);
    return result;
  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 6), [savedBills]);
  const categoryMax = Math.max(1, ...categoryTotals.map(([, amount]) => amount));
  const categoryTotal = categoryTotals.reduce((sum, [, amount]) => sum + amount, 0);
  const categoryTrend = useMemo(() => {
    const grouped = savedBills.reduce((result, bill) => {
      const key = (bill.billDate || bill.completedAt || '').slice(0, 7);
      if (key) result[key] = (result[key] || 0) + Number(bill.grandTotal || 0);
      return result;
    }, {});
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-6);
  }, [savedBills]);
  const maxTrend = Math.max(1, ...categoryTrend.map(([, amount]) => amount));
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthBills = savedBills.filter(bill => (bill.billDate || bill.completedAt || '').slice(0, 7) === thisMonth);
  const monthSpend = monthBills.reduce((sum, bill) => sum + Number(bill.grandTotal || 0), 0);
  const net = metrics.receivable - metrics.payable;
  const newBill = () => { useBillStore.getState().resetBill(); setActiveTab('bills'); setStep(1); };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-content page-stack">
        <PageHeader
          eyebrow="Your space"
          title={`Hey, ${user?.name?.split(' ')[0] || 'there'}.`}
          description="Here’s where everyone stands — and what needs a nudge."
          actions={<button type="button" onClick={newBill} className="btn-primary"><Icon name="add" className="text-xl" />New split</button>}
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
          <section className="receipt-panel relative overflow-hidden bg-brand-primary p-6 text-[#151714] sm:p-8" aria-label="Balance summary">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">{net === 0 ? 'Your net balance' : net > 0 ? 'You’re owed' : 'You owe'}</p>
                <p className="mt-1 text-xs opacity-70">Across outstanding bills</p>
              </div>
              <Icon name={net >= 0 ? 'south_west' : 'north_east'} className="text-3xl" />
            </div>
            {balanceLoading
              ? <div role="status" className="my-7 h-14 w-2/3 animate-pulse rounded-lg bg-[#151714]/10" aria-label="Loading balance" />
              : <p className={`my-7 break-words font-numeric text-[clamp(2rem,4vw,3.8rem)] font-extrabold leading-tight tracking-tighter ${balanceError ? 'text-2xl' : ''}`}>
                  {balanceError ? 'Unavailable' : `${net < 0 ? '− ' : ''}${money(net)}`}
                </p>}
            <div className="grid grid-cols-2 gap-4 border-t-2 border-dashed border-[#151714]/25 pt-5">
              <div>
                <p className="flex items-center gap-1 text-sm"><Icon name="south_west" className="text-base" />Owed to you</p>
                <p className="mt-1 break-words font-numeric text-lg font-bold">{balanceError || balanceLoading ? '—' : money(metrics.receivable)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1 text-sm"><Icon name="north_east" className="text-base" />You owe</p>
                <p className="mt-1 break-words font-numeric text-lg font-bold">{balanceError || balanceLoading ? '—' : money(metrics.payable)}</p>
              </div>
            </div>
            {balanceError && (
              <div role="alert" className="mt-4 text-sm">
                <p>{balanceError}</p>
                <button type="button" className="mt-1 min-h-11 underline" onClick={fetchDebts}>Retry balances</button>
              </div>
            )}
          </section>

          <aside className="panel flex flex-col justify-between p-6 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow">This month</p>
                <h2 className="text-3xl font-extrabold tracking-tighter font-numeric">{money(monthSpend)}</h2>
                <p className="mt-2 text-sm text-secondary">{monthBills.length ? `Across ${monthBills.length} saved ${monthBills.length === 1 ? 'bill' : 'bills'}.` : 'No saved bills this month yet.'}</p>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[--brand-primary-subtle] text-[--brand-ink]"><Icon name="receipt_long" className="text-xl" /></span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 border-t border-border pt-5">
              <div className="rounded-xl bg-surface-base p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-tertiary">Open items</p>
                <p className="mt-1 text-xl font-bold font-numeric">{safeDebts.length}</p>
              </div>
              <div className="rounded-xl bg-surface-base p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-tertiary">Saved bills</p>
                <p className="mt-1 text-xl font-bold font-numeric">{savedBills.length}</p>
              </div>
            </div>
            <button type="button" onClick={() => setActiveTab('history')} className="mt-5 flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-primary">
              Review history <Icon name="arrow_forward" className="text-base" />
            </button>
          </aside>
        </div>

        <section className="panel overflow-hidden" aria-labelledby="outstanding-heading">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5 sm:p-6">
            <div>
              <h2 id="outstanding-heading" className="text-xl font-bold">Outstanding payments</h2>
              <p className="mt-1 text-sm text-secondary">Who owes whom, without the spreadsheet.</p>
            </div>
            {!balanceLoading && !balanceError && <span className="chip">{safeDebts.length} open</span>}
          </div>

          {balanceError && <p role="alert" className="inline-error m-5 sm:m-6">{balanceError}</p>}
          {balanceLoading && (
            <div role="status" className="space-y-3 p-5 sm:p-6" aria-label="Loading outstanding payments">
              {[1, 2, 3].map(item => <div key={item} className="h-14 animate-pulse rounded-xl bg-surface-raised" />)}
            </div>
          )}
          {!balanceLoading && !balanceError && !safeDebts.length && (
            <div className="empty-state py-10">
              <span className="empty-state-icon"><Icon name="task_alt" className="text-2xl" /></span>
              <h3 className="text-lg font-bold">Everyone is settled up.</h3>
              <p className="max-w-sm text-sm text-secondary">When a bill has an unpaid share, it will show up here.</p>
            </div>
          )}
          {!balanceLoading && !balanceError && safeDebts.length > 0 && (
            <div className="px-5 pb-2 sm:px-6">
              {safeDebts.map(debt => (
                <button
                  type="button"
                  key={`${debt.bill_id}:${debt.person_id}:${debt.direction}`}
                  onClick={() => setSelectedBillId(debt.bill_id)}
                  className="data-row w-full text-left transition-colors hover:bg-surface-raised"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${debt.direction === 'payable' ? 'bg-[--semantic-warning-bg] text-[--semantic-warning]' : 'bg-[--brand-primary-subtle] text-[--brand-ink]'}`}>
                      <Icon name={debt.direction === 'payable' ? 'north_east' : 'south_west'} className="text-lg" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{debt.direction === 'payable' ? `You owe ${debt.name}` : `${debt.name} owes you`}</span>
                      <span className="block truncate text-xs text-secondary">{debt.title}</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <strong className="font-numeric text-sm">{money(debt.amount)}</strong>
                    <Icon name="chevron_right" className="text-lg text-tertiary" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {!settlementsLoading && !settlementsError && settlements.length > 0 && (
            <details className="border-t border-border px-5 py-4 sm:px-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-secondary">
                <span>Net settlement view</span>
                <span className="chip">{settlements.length} transfers</span>
              </summary>
              <div className="pt-2">
                {settlements.map((item, index) => (
                  <div key={`${item.counterparty}:${item.direction}:${index}`} className="data-row">
                    <span className="text-sm">{item.direction === 'payable' ? `You owe ${item.counterparty}` : `${item.counterparty} owes you`}</span>
                    <strong className="font-numeric text-sm">{money(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </details>
          )}
          {!settlementsLoading && settlementsError && <p className="border-t border-border px-5 py-4 text-xs text-secondary sm:px-6">Net view unavailable: {settlementsError}</p>}
        </section>

        <section aria-labelledby="recent-heading">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 id="recent-heading" className="text-xl font-bold tracking-tight">Recent splits</h2>
              <p className="mt-1 text-sm text-secondary">Your latest saved bills.</p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setActiveTab('history')}>View all <Icon name="arrow_forward" className="text-base" /></button>
          </div>
          <ActivityFeed bills={recent} isLoading={isLoading} error={error} onSelectBill={setSelectedBillId} onNewBill={newBill} />
        </section>

        <AssignmentInbox onSelectBill={setSelectedBillId} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <section className="panel p-5 sm:p-6" aria-labelledby="category-heading">
            <div className="section-heading">
              <div>
                <h2 id="category-heading">Spending by category</h2>
                <p>Where the saved bills went.</p>
              </div>
              {categoryTotal > 0 && <span className="chip">{money(categoryTotal)}</span>}
            </div>
            {!categoryTotals.length ? (
              <div className="empty-state py-8">
                <span className="empty-state-icon"><Icon name="category" className="text-2xl" /></span>
                <p className="text-sm text-secondary">Categories will appear as you save bills.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {categoryTotals.map(([category, amount]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="font-semibold">{category}</span>
                      <span className="font-numeric text-secondary">{money(amount)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-raised" role="img" aria-label={`${category}: ${money(amount)}`}>
                      <div className="h-full rounded-full bg-brand-primary" style={{ width: `${Math.max(4, amount / categoryMax * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="trend-heading">
            <div className="section-heading">
              <div>
                <h2 id="trend-heading">Spending trend</h2>
                <p>Saved bill totals by month.</p>
              </div>
              {categoryTrend.length > 0 && <span className="chip">{categoryTrend.length} mo</span>}
            </div>
            {!categoryTrend.length ? (
              <div className="empty-state py-8">
                <span className="empty-state-icon"><Icon name="bar_chart" className="text-2xl" /></span>
                <p className="text-sm text-secondary">A trend appears after you save bills.</p>
              </div>
            ) : (
              <div className="overflow-x-auto pb-1">
                <div className="flex h-52 min-w-[320px] items-end gap-3">
                  {categoryTrend.map(([month, amount]) => (
                    <div key={month} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" role="img" aria-label={`${monthLabel(month)}: ${money(amount)}`}>
                      <span className="text-[11px] font-semibold text-secondary">{compactMoney(amount)}</span>
                      <div className="w-full max-w-12 rounded-t-lg bg-brand-primary" style={{ height: `${Math.max(8, amount / maxTrend * 78)}%` }} />
                      <span className="text-[11px] text-secondary">{monthLabel(month)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
});
