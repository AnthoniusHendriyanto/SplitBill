import { memo, useMemo } from 'react';
import useBillStore from '../../store/useBillStore';
import useAuthStore from '../../store/useAuthStore';
import Icon from '../Icon';
import ActivityFeed from './ActivityFeed';

const money = amount => `Rp ${Math.abs(amount).toLocaleString('id-ID')}`;

export default memo(function Dashboard({ setActiveTab, setStep, setSelectedBillId }) {
  const bills = useBillStore(s => s.completedBills);
  const isLoading = useBillStore(s => s.isLoadingBills);
  const error = useBillStore(s => s.billsError);
  const user = useAuthStore(s => s.user);
  const metrics = useMemo(() => bills.reduce((sum, bill) => ({
    receivable: sum.receivable + (bill.receivable || 0),
    payable: sum.payable + (bill.payable || 0),
  }), { receivable: 0, payable: 0 }), [bills]);
  const recent = useMemo(() => [...bills].sort((a, b) => new Date(b.completedAt || 0) - new Date(a.completedAt || 0)).slice(0, 5), [bills]);
  const newBill = () => { setActiveTab('bills'); setStep(1); };
  const net = metrics.receivable - metrics.payable;
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="page-content space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <div><p className="text-sm text-secondary mb-2">Your people. Your plans.</p><h1 className="page-title">Hey, {user?.name?.split(' ')[0] || 'there'}.</h1><p className="text-secondary text-sm mt-3">Here’s where everyone stands.</p></div>
          <button onClick={newBill} className="btn-primary self-start"><Icon name="add" className="text-xl" />New Split</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.45fr_1fr] gap-5">
          <section className="rounded-2xl bg-brand-primary text-[#151714] p-6 sm:p-8 relative overflow-hidden" aria-label="Balance summary">
            <div className="flex items-center justify-between gap-4"><p className="font-semibold text-sm">Your net balance</p><Icon name="call_split" className="text-3xl" /></div>
            {isLoading ? <div role="status" className="h-14 w-2/3 my-7 rounded-lg bg-[#151714]/10 animate-pulse" aria-label="Loading balance" /> : <p className="text-[clamp(2rem,4vw,3.8rem)] leading-tight tracking-tighter font-extrabold font-numeric my-7 break-words">{error ? 'Unavailable' : `${net < 0 ? '− ' : ''}${money(net)}`}</p>}
            <div className="border-t-2 border-dashed border-[#151714]/25 pt-5 grid grid-cols-2 gap-5">
              <div><p className="text-sm flex items-center gap-1"><Icon name="south_west" className="text-base" />Owed to you</p><p className="text-lg font-bold mt-1 font-numeric break-words">{error || isLoading ? '—' : money(metrics.receivable)}</p></div>
              <div><p className="text-sm flex items-center gap-1"><Icon name="north_east" className="text-base" />You owe</p><p className="text-lg font-bold mt-1 font-numeric break-words">{error || isLoading ? '—' : money(metrics.payable)}</p></div>
            </div>
          </section>
          <aside className="receipt-panel p-6 sm:p-8 flex flex-col justify-between">
            <span className="w-12 h-12 rounded-full border border-border-strong flex items-center justify-center"><Icon name="receipt_long" className="text-2xl" /></span>
            <div className="my-5"><h2 className="text-2xl font-extrabold tracking-tight">The hangout’s over.<br />The math is handled.</h2><p className="text-secondary text-sm leading-relaxed mt-3">Scan the receipt, add your people, and give everyone their share.</p></div>
            <div className="receipt-divider pt-4 flex justify-between text-xs text-secondary"><span>Made for shared moments</span><Icon name="done_all" className="text-lg" /></div>
          </aside>
        </div>
        <div>
          <div className="flex justify-between items-center gap-4 mb-4"><h2 className="text-xl font-bold tracking-tight">Recent splits</h2><button className="text-sm font-semibold text-brand-primary min-h-11 flex items-center gap-2" onClick={() => setActiveTab('history')}>View history <Icon name="arrow_forward" className="text-base" /></button></div>
          <ActivityFeed bills={recent} isLoading={isLoading} error={error} onSelectBill={setSelectedBillId} onNewBill={newBill} />
        </div>
      </div>
    </div>
  );
});
