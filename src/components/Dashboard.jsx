import { memo, useState } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import useAuthStore from '../store/useAuthStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

function Dashboard({ setActiveTab, setStep, setSelectedBillId }) {
  const [toastMsg, setToastMsg] = useState(null);
  const completedBills = useBillStore((s) => s.completedBills);
  const isLoadingBills = useBillStore((s) => s.isLoadingBills);
  const billsError = useBillStore((s) => s.billsError);

  const totalOwed = completedBills
    .filter(b => b.status === 'pending')
    .reduce((sum, b) => {
      const unpaidPersons = b.persons.filter(p => !p.paid && p.id !== b.payerId);
      const unpaidTotal = unpaidPersons.reduce((pSum, p) => {
        const pT = b.totals.find(t => t.id === p.id)?.total || 0;
        return pSum + pT;
      }, 0);
      return sum + unpaidTotal;
    }, 0);

  const currentUser = useAuthStore.getState().user;
  const currentMonth = new Date().getMonth();
  const monthlySpending = completedBills
    .filter(b => b.status !== 'draft' && new Date(b.completedAt).getMonth() === currentMonth)
    .reduce((sum, b) => {
      const myPerson = b.persons.find(p =>
        p.isCurrentUser || p.userId === currentUser?.id ||
        (currentUser?.name && p.name?.toLowerCase() === currentUser.name.toLowerCase())
      );
      if (!myPerson) return sum + (b.grandTotal || 0);
      const myTotal = b.totals.find(t => t.id === myPerson.id)?.total || 0;
      return sum + myTotal;
    }, 0);
  const pendingSettlementsCount = completedBills.filter(b => b.status === 'pending').length;
  const monthlyBillsCount = completedBills.filter(b => new Date(b.completedAt).getMonth() === currentMonth).length;

  const peopleWhoOweYou = [];
  completedBills.forEach(b => {
    if (b.status === 'pending') {
      b.persons.forEach(p => {
        if (!p.paid && p.id !== b.payerId) {
          const pTotal = b.totals.find(t => t.id === p.id)?.total || 0;
          if (pTotal > 0) {
            peopleWhoOweYou.push({
              id: `${b.id}-${p.id}`, billId: b.id, personId: p.id,
              name: p.name, billTitle: b.title, amount: pTotal,
            });
          }
        }
      });
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 overflow-y-auto p-8 space-y-8 bg-page text-slate-100 font-inter hide-scrollbar"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-slate-100 text-3xl font-black tracking-tight"><span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">Financial Workspace</span></h1>
          <p className="text-slate-500 text-xs font-semibold mt-1 uppercase tracking-wider">SplitMate SaaS Platform</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { setActiveTab('bills'); setStep(1); }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all flex items-center gap-2 border-none outline-none cursor-pointer"
          >
            <Icon name="add" className="text-base" /> New Bill
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Receivables (Owed to You)', value: `Rp ${totalOwed.toLocaleString('id-ID')}`, sub: 'Active Outstanding Balance', icon: 'trending_up', bg: 'bg-emerald-500/5', bgHover: 'group-hover:bg-emerald-500/10', iconColor: 'text-emerald-500', textColor: 'text-emerald-400/80' },
          { label: 'Monthly Spending', value: `Rp ${monthlySpending.toLocaleString('id-ID')}`, sub: 'Cumulative totals this month', icon: 'payments', bg: 'bg-indigo-500/5', bgHover: 'group-hover:bg-indigo-500/10', iconColor: 'text-indigo-400', textColor: 'text-indigo-400/80' },
          { label: 'Pending Settlements', value: `${pendingSettlementsCount} active`, sub: 'Awaiting settlement confirmation', icon: 'pending_actions', bg: 'bg-amber-500/5', bgHover: 'group-hover:bg-amber-500/10', iconColor: 'text-amber-500', textColor: 'text-amber-400/80' },
          { label: 'Bills This Month', value: `${monthlyBillsCount} ledgers`, sub: 'Drafts and finalized statements', icon: 'receipt', bg: 'bg-purple-500/5', bgHover: 'group-hover:bg-purple-500/10', iconColor: 'text-purple-400', textColor: 'text-purple-400/80' },
        ].map((card, i) => (
          <div key={i} className="bg-card border border-slate-900 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
            <div className={`absolute -right-6 -top-6 w-24 h-24 ${card.bg} rounded-full blur-xl pointer-events-none ${card.bgHover} transition-all`} />
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-widest">{card.label}</span>
              <Icon name={card.icon} className={`${card.iconColor} text-base`} />
            </div>
            <h3 className="text-2xl font-black mt-3 text-white font-numeric">{card.value}</h3>
            <p className={`text-[10px] ${card.textColor} font-bold mt-2`}>{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 space-y-8">
          <div className="bg-card border border-slate-900 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
                  Recent Activity Timeline
                </h3>
              </div>
            </div>
            <div className="space-y-4">
              {isLoadingBills ? (
                <div className="space-y-4" aria-live="polite" aria-busy="true">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-900/50 rounded-xl animate-pulse">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-800" />
                        <div className="space-y-2">
                          <div className="h-4 w-40 bg-slate-800 rounded" />
                          <div className="h-3 w-24 bg-slate-800 rounded" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 w-20 bg-slate-800 rounded" />
                        <div className="h-3 w-16 bg-slate-800 rounded ml-auto" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : billsError ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-red-950/20 border border-dashed border-red-900/30 rounded-2xl">
                  <Icon name="error" className="text-3xl text-red-500 mb-3" />
                  <p className="text-xs font-bold text-red-400 mb-1">Failed to load bills</p>
                  <p className="text-[10px] text-red-500/70 max-w-[280px] leading-relaxed">
                    {billsError}
                  </p>
                </div>
              ) : completedBills.length > 0 ? (
                completedBills.map((item) => (
                  <div key={item.id} role="button" tabIndex={0}
                    onClick={() => setSelectedBillId(item.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedBillId(item.id); } }}
                    className="flex items-center justify-between p-4 bg-slate-950/40 border border-slate-900/50 hover:border-indigo-500/20 rounded-xl transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shadow-sm group-hover:scale-105 transition-transform">
                        <Icon name="receipt" className="text-lg" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors text-sm">{item.title || 'Untitled Bill'}</p>
                        <p className="text-[10px] text-slate-500 font-bold">{new Date(item.completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-slate-200 font-numeric text-sm">Rp {item.grandTotal.toLocaleString('id-ID')}</p>
                      <span className={cn("text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider mt-1.5 inline-block border",
                        item.status === 'completed' ? "bg-green-950/30 text-green-400 border-green-900/30" :
                        item.status === 'draft' ? "bg-indigo-950/30 text-indigo-400 border-indigo-900/30" :
                        "bg-amber-950/30 text-amber-400 border-amber-900/30")}>
                        {item.status || 'pending'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4 bg-slate-950/20 border border-dashed border-slate-900 rounded-2xl">
                  <Icon name="history" className="text-3xl text-slate-700 mb-3" />
                  <p className="text-xs font-bold text-slate-400 mb-1">No split history registered</p>
                  <p className="text-[10px] text-slate-500 max-w-[280px] leading-relaxed">
                    Scan a receipt or start a manual ledger to populate your dashboard timeline!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 space-y-8">
          <div className="bg-card border border-slate-900 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-3 bg-amber-500 rounded-full inline-block"></span>
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3.5">
              {[
                { icon: 'add', label: 'New Bill', hoverBorder: 'hover:border-indigo-500/30', iconColor: 'text-indigo-400', action: () => { setActiveTab('bills'); setStep(1); } },
                { icon: 'document_scanner', label: 'Scan Receipt', hoverBorder: 'hover:border-emerald-500/30', iconColor: 'text-emerald-400', action: () => { setActiveTab('bills'); setStep(1); } },
                { icon: 'done_all', label: 'Quick Settle', hoverBorder: 'hover:border-amber-500/30', iconColor: 'text-amber-400', action: () => { setToastMsg('Quick Settle initiated! Choose an active pending bill from the Recent Activity list.'); setTimeout(() => setToastMsg(null), 3000); } },
                { icon: 'person_add', label: 'Add Friend', hoverBorder: 'hover:border-purple-500/30', iconColor: 'text-purple-400', action: () => { setActiveTab('bills'); setStep(3); } },
              ].map((btn, i) => (
                <button key={i} onClick={btn.action}
                  className={`p-3 bg-slate-950/40 border border-slate-900 ${btn.hoverBorder} hover:bg-slate-900/40 rounded-xl flex flex-col items-center justify-center text-center gap-2 transition-all cursor-pointer outline-none group`}
                >
                  <Icon name={btn.icon} className={`text-lg ${btn.iconColor} group-hover:scale-110 transition-transform`} />
                  <span className="text-[10px] font-bold text-slate-300">{btn.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-card border border-slate-900 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-3 bg-emerald-500 rounded-full inline-block"></span>
              Receivables Details
            </h3>
            <div className="space-y-3.5">
              {peopleWhoOweYou.length > 0 ? (
                peopleWhoOweYou.map((debtor) => (
                  <div key={debtor.id} className="flex justify-between items-center p-3 bg-slate-950/40 border border-slate-900 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-slate-200">{debtor.name}</p>
                      <p className="text-[9px] text-slate-500 font-medium mt-0.5">Owes for: {debtor.billTitle}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span className="text-xs font-black text-emerald-400 font-numeric">Rp {debtor.amount.toLocaleString('id-ID')}</span>
                      <button onClick={() => { setToastMsg(`Payment reminder sent to ${debtor.name}!`); setTimeout(() => setToastMsg(null), 3000); }}
                        className="p-1.5 bg-indigo-950/50 hover:bg-indigo-900/30 border border-indigo-900/30 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer outline-none"
                        title="Send Reminder"
                      >
                        <Icon name="notifications_active" className="text-xs" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-900">
                  <Icon name="group" className="text-2xl text-slate-800 mb-2" />
                  <p className="text-[10px] font-bold text-slate-500">No outstanding receivables</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-slate-900 rounded-2xl p-6 relative overflow-hidden">
            <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2 mb-4">
              <span className="w-1.5 h-3 bg-rose-500 rounded-full inline-block"></span>
              Payables (You Owe)
            </h3>
            <div className="space-y-3.5">
              <div className="flex flex-col items-center justify-center py-6 text-center bg-slate-950/20 rounded-xl border border-dashed border-slate-900">
                <Icon name="check_circle" className="text-2xl text-slate-800 mb-2" />
                <p className="text-[10px] font-bold text-slate-500">No outstanding payables</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {toastMsg && (
        <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl shadow-xl text-xs font-bold text-white animate-fadeIn" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </motion.div>
  );
}

export default memo(Dashboard);
