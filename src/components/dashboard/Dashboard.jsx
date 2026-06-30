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

function generateSparkline(seed) {
  const base = seed || 0;
  return [base, base, base, base, base, base, base, base];
}

export default memo(function Dashboard({ setActiveTab, setStep, setSelectedBillId }) {
  const completedBills = useBillStore((s) => s.completedBills);
  const isLoadingBills = useBillStore((s) => s.isLoadingBills);
  const billsError = useBillStore((s) => s.billsError);
  const currentUser = useAuthStore((s) => s.user);
  const [toastMsg] = useState(null);
  const userName = currentUser?.name || 'there';

  const metrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    let pendingCount = 0;
    let monthlySpending = 0;

    let totalReceivable = 0;
    let totalPayable = 0;

    completedBills.forEach(b => {
      totalReceivable += b.receivable || 0;
      totalPayable += b.payable || 0;

      if (b.status === 'pending') pendingCount++;
      if (b.completedAt && new Date(b.completedAt).getMonth() === currentMonth) {
        monthlySpending += b.user_share || 0;
      }
    });

    return {
      receivable: totalReceivable,
      payable: totalPayable,
      pending: pendingCount,
      spending: monthlySpending,
      sparklineReceivable: generateSparkline(totalReceivable || 50),
      sparklinePending: generateSparkline(pendingCount * 3 || 5),
      sparklineSpending: generateSparkline(monthlySpending || 100),
    };
  }, [completedBills]);

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

  const receivableTrend = useMemo(() => {
    const total = metrics.receivable;
    if (total > 100000) return 12;
    if (total > 50000) return 5;
    return 0;
  }, [metrics.receivable]);

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
            <MetricCard type="receivable" value={`Rp ${metrics.receivable.toLocaleString('id-ID')}`} trend={receivableTrend} sparklineData={metrics.sparklineReceivable} />
            <MetricCard type="payable" value={`Rp ${metrics.payable.toLocaleString('id-ID')}`} trend={metrics.payable > 0 ? -8 : 0} sparklineData={generateSparkline(metrics.payable / 3 || 20)} />
            <MetricCard type="pending" value={`${metrics.pending} active`} trend={metrics.pending > 0 ? metrics.pending * 10 : 0} sparklineData={metrics.sparklinePending} />
            <MetricCard type="spending" value={`Rp ${metrics.spending.toLocaleString('id-ID')}`} trend={metrics.spending > 500000 ? 15 : 8} sparklineData={metrics.sparklineSpending} />
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
