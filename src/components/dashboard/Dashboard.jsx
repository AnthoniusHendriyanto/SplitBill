import { memo, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../../store/useBillStore';
import useAuthStore from '../../store/useAuthStore';
import Icon from '../Icon';
import MetricCard from './MetricCard';
import ActivityFeed from './ActivityFeed';
import QuickActions from './QuickActions';
import { UpcomingSettlements, FriendsBalanceSummary, ExpenseBreakdownChart } from './SidebarWidgets';
import MonthlyTrendChart from './MonthlyTrendChart';


const greetings = ['Good morning', 'Good afternoon', 'Good evening'];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return greetings[0];
  if (h < 17) return greetings[1];
  return greetings[2];
}

function monthKey(y, m) {
  return `${y}-${String(m + 1).padStart(2, '0')}`;
}

function parseMonthKey(key) {
  const [y, m] = key.split('-').map(Number);
  return { y, m: m - 1 };
}

function prevMonth(y, m) {
  return m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
}

function nextMonth(y, m) {
  return m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 };
}

function getBillMonthKey(bill) {
  if (bill.billDate) {
    const d = new Date(bill.billDate);
    if (!isNaN(d.getTime())) return monthKey(d.getFullYear(), d.getMonth());
  }
  if (bill.completedAt) {
    const d = new Date(bill.completedAt);
    if (!isNaN(d.getTime())) return monthKey(d.getFullYear(), d.getMonth());
  }
  return null;
}

export default memo(function Dashboard({ setActiveTab, setStep, setSelectedBillId }) {
  const completedBills = useBillStore((s) => s.completedBills);
  const isLoadingBills = useBillStore((s) => s.isLoadingBills);
  const billsError = useBillStore((s) => s.billsError);
  const currentUser = useAuthStore((s) => s.user);
  const [toastMsg] = useState(null);
  const userName = currentUser?.name || 'there';

  const now = new Date();
  const defaultMonth = monthKey(now.getFullYear(), now.getMonth());
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const { y: selY, m: selM } = parseMonthKey(selectedMonth);
  const { y: prevY, m: prevM } = prevMonth(selY, selM);
  const prevKey = monthKey(prevY, prevM);

  const monthMetrics = useMemo(() => {
    const monthBills = completedBills.filter(b => getBillMonthKey(b) === selectedMonth);
    const prevBills = completedBills.filter(b => getBillMonthKey(b) === prevKey);

    const monthSum = monthBills.reduce((s, b) => s + (b.user_share || 0), 0);
    const prevSum = prevBills.reduce((s, b) => s + (b.user_share || 0), 0);
    let trend = 0;
    if (prevSum > 0) trend = Math.round(((monthSum - prevSum) / prevSum) * 100);
    else if (monthSum > 0) trend = 100;

    const monthReceivable = monthBills.reduce((s, b) => s + (b.receivable || 0), 0);
    const prevReceivable = prevBills.reduce((s, b) => s + (b.receivable || 0), 0);
    let receivableTrend = 0;
    if (prevReceivable > 0) receivableTrend = Math.round(((monthReceivable - prevReceivable) / prevReceivable) * 100);
    else if (monthReceivable > 0) receivableTrend = 100;

    return { spending: monthSum, spendingTrend: trend, receivableTrend };
  }, [completedBills, selectedMonth, prevKey]);

  const monthName = new Date(selY, selM).toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const handlePrevMonth = useCallback(() => {
    const { y, m } = prevMonth(selY, selM);
    setSelectedMonth(monthKey(y, m));
  }, [selY, selM]);

  const handleNextMonth = useCallback(() => {
    const { y, m } = nextMonth(selY, selM);
    setSelectedMonth(monthKey(y, m));
  }, [selY, selM]);

  const metrics = useMemo(() => {
    let pendingCount = 0;
    let totalReceivable = 0;
    let totalPayable = 0;

    completedBills.forEach(b => {
      totalReceivable += b.receivable || 0;
      totalPayable += b.payable || 0;
      if (b.status === 'pending') pendingCount++;
    });

    return {
      receivable: totalReceivable,
      payable: totalPayable,
      pending: pendingCount,
    };
  }, [completedBills]);

  const receivableTrend = monthMetrics.receivableTrend;

  const handleAction = useCallback((tab, step) => {
    if (tab) setActiveTab(tab);
    if (step) setStep(step);
  }, [setActiveTab, setStep]);

  const handleNewBill = useCallback(() => {
    setActiveTab('bills');
    setStep(1);
  }, [setActiveTab, setStep]);

  const handleViewBill = useCallback((billId) => {
    setSelectedBillId(billId);
  }, [setSelectedBillId]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-1 overflow-y-auto bg-page hide-scrollbar"
    >
      <div className="max-w-[1440px] mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[--text-primary] tracking-tight">
                {getGreeting()}, {userName} <span className="inline-block" role="img" aria-label="wave">👋</span>
              </h1>
              <p className="text-sm text-tertiary mt-1">Track expenses and settle balances effortlessly.</p>
            </div>
            <button onClick={handleNewBill}
              className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-[--brand-primary] hover:bg-[--brand-primary-hover] text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-[--brand-primary-glow] hover:shadow-xl cursor-pointer border-none outline-none"
            >
              <Icon name="add" className="text-lg" /> New Split
            </button>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <MetricCard type="receivable" value={`Rp ${metrics.receivable.toLocaleString('id-ID')}`} trend={receivableTrend} />
            <MetricCard type="payable" value={`Rp ${metrics.payable.toLocaleString('id-ID')}`} trend={metrics.payable > 0 ? -8 : 0} />
            <MetricCard type="pending" value={`${metrics.pending} active`} trend={metrics.pending > 0 ? metrics.pending * 10 : 0} />
            <MetricCard type="spending"
              value={`Rp ${monthMetrics.spending.toLocaleString('id-ID')}`}
              trend={monthMetrics.spendingTrend}
              headerRight={
                <div className="flex items-center gap-1 -mr-1">
                  <button onClick={handlePrevMonth}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-tertiary hover:text-[--text-primary] hover:bg-white/5 transition-all cursor-pointer border-none outline-none"
                    aria-label="Previous month"
                  >
                    <Icon name="chevron_left" className="text-sm" />
                  </button>
                  <span className="text-[10px] font-semibold text-tertiary whitespace-nowrap min-w-[90px] text-center select-none">
                    {monthName}
                  </span>
                  <button onClick={handleNextMonth}
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-tertiary hover:text-[--text-primary] hover:bg-white/5 transition-all cursor-pointer border-none outline-none"
                    aria-label="Next month"
                  >
                    <Icon name="chevron_right" className="text-sm" />
                  </button>
                </div>
              }
            />
          </div>
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column - Activity + Quick Actions + Charts */}
          <div className="xl:col-span-8 space-y-6">
            <ActivityFeed
              bills={completedBills}
              isLoading={isLoadingBills}
              error={billsError}
              onSelectBill={handleViewBill}
              onNewBill={handleNewBill}
            />

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ExpenseBreakdownChart bills={completedBills} />
              <MonthlyTrendChart bills={completedBills} />
            </div>

          </div>

          {/* Right Column - Sidebar Widgets */}
          <div className="xl:col-span-4 space-y-6">
            <QuickActions onAction={handleAction} />
            <UpcomingSettlements bills={completedBills} />
            <FriendsBalanceSummary bills={completedBills} />
          </div>
        </div>
      </div>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-[--text-primary] text-[--text-inverse] rounded-2xl shadow-xl text-sm font-semibold animate-fade-in" role="alert">
          {toastMsg}
        </div>
      )}
    </motion.div>
  );
});
