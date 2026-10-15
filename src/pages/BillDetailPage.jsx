import { memo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import useAuthStore from '../store/useAuthStore';
import Icon from '../components/Icon';
import Skeleton from '../components/Skeleton';
import { api } from '../lib/api';
import { cn } from '../utils/cn';
import ThemeToggle from '../components/ThemeToggle';

const avatarColors = ['bg-brand-primary text-[#151714]', 'bg-brand-subtle text-primary', 'bg-surface-raised text-primary'];

function BillDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => !!s.accessToken);
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      api.getBill(id)
        .then(data => {
          const billData = data.bill || data;
          const persons = billData.persons || [];
          const items = billData.items || [];
          const payer = persons.find(p => p.is_payer);

          setBill({
            id: billData.id,
            title: billData.title,
            completedAt: billData.created_at,
            grandTotal: billData.grand_total,
            items,
            persons,
            payerId: payer?.id || null,
            serviceCharge: billData.service_charge,
            tax: billData.tax,
            assignments: {},
            totals: persons.map(p => {
              const personItems = items.filter(item =>
                item.assigned_to?.includes(p.name)
              );
              const subtotal = personItems.reduce((sum, item) => sum + item.price, 0);
              const serviceShare = subtotal * ((billData.service_charge || 0) / 100);
              const taxShare = subtotal * ((billData.tax || 0) / 100);
              return {
                id: p.id, name: p.name,
                subtotal,
                tax: taxShare,
                service: serviceShare,
                total: subtotal + serviceShare + taxShare,
              };
            }),
          });
        })
        .catch(err => console.error('Failed to fetch bill:', err))
        .finally(() => setLoading(false));
    } else {
      useAuthStore.getState().silentRefresh().then(ok => { if (!ok) setLoading(false); });
    }
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4" aria-live="polite" aria-busy="true">
        <div className="w-full max-w-4xl space-y-6">
          <Skeleton className="w-32 h-8" />
          <div className="flex justify-between">
            <div className="space-y-2">
              <Skeleton className="w-64 h-10" />
              <Skeleton className="w-48 h-5" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="w-24 h-4 ml-auto" />
              <Skeleton className="w-36 h-10 ml-auto" />
            </div>
          </div>
          <Skeleton className="w-full h-64" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!bill) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center p-4">
        <div className="text-center">
          <Icon name="receipt_long" className="text-6xl text-primary mb-4" />
          <h1 className="text-xl font-bold text-primary mb-5">{isAuthenticated ? 'Bill unavailable' : 'Sign in to see this bill'}</h1>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-[--brand-primary] text-[--text-inverse] rounded-xl font-bold hover:bg-[--brand-primary-hover] transition-all cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { persons, items, totals, payerId, grandTotal, assignments } = bill;
  const payer = persons.find(p => p.id === payerId);

  return (
    <div className="min-h-[100dvh] bg-page antialiased">
      <div className="page-content max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            <Icon name="arrow_back" className="text-lg" />
            Back to Dashboard
          </button>
          <ThemeToggle />
          </div>

          <div className="flex flex-wrap gap-6 items-center justify-between mb-8 pb-6 border-b border-border">
            <div>
              <h1 className="page-title">{bill.title}</h1>
              <p className="text-sm text-tertiary mt-1 font-medium">
                {bill.bill_date
                  ? new Date(bill.bill_date + 'T12:00:00').toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric'
                    })
                  : new Date(bill.completedAt).toLocaleDateString('id-ID', {
                      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1">Grand Total</p>
              <p className="text-3xl font-black text-[--brand-primary] tabular-nums">Rp {grandTotal.toLocaleString('id-ID')}</p>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Items */}
            <div className="receipt-panel p-6">
              <h2 className="font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="receipt" className="text-[--brand-primary]" />
                Items
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-border">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between py-3">
                    <span className="font-medium text-tertiary dark:text-primary">{item.name}</span>
                    <span className="font-bold text-primary">Rp {item.price.toLocaleString('id-ID')}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t-2 border-slate-200 dark:border-strong flex justify-between">
                <span className="font-bold text-tertiary text-sm">Subtotal</span>
                <span className="font-bold text-primary">Rp {items.reduce((s, i) => s + i.price, 0).toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Settlement */}
            <div className="receipt-panel p-6">
              <h2 className="font-bold text-primary mb-4 flex items-center gap-2">
                <Icon name="account_balance" className="text-[--brand-primary]" />
                Settlement
              </h2>

              {payer && (
                <div className="flex items-center gap-3 p-4 bg-[--brand-primary-subtle] rounded-xl border border-[--brand-primary]/20 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[--brand-primary] flex items-center justify-center text-[--text-inverse] font-bold shadow-sm">
                    {payer.name?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[--brand-primary] uppercase tracking-wider">Payer</p>
                    <p className="font-bold text-primary">{payer.name}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-[11px] font-bold text-tertiary uppercase">Paid</p>
                    <p className="font-bold text-primary tabular-nums">Rp {grandTotal.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {totals.map((person, i) => {
                  return (
                    <div key={person.id} className="flex flex-wrap gap-4 items-center justify-between p-4 bg-surface-base rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", avatarColors[i % avatarColors.length])}>
                          {person.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-primary">{person.name}</p>
                          <p className="text-[10px] text-tertiary">
                            {person.id === payerId ? 'Paid the bill' : 'Owes'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-black text-sm",
                          person.id === payerId ? "text-[--brand-primary]" : "text-primary"
                        )}>
                          Rp {person.total.toLocaleString('id-ID')}
                        </p>
                        {person.id !== payerId && (
                          <p className="text-xs text-error font-bold">
                            owes Rp {person.total.toLocaleString('id-ID')}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Per-Person Breakdown */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
              {totals.map((person, i) => {
                const assignedItems = items.filter(item => assignments[person.id]?.[item.id]);
                return (
                  <div key={person.id} className="receipt-panel p-5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold", avatarColors[i % avatarColors.length])}>
                        {person.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-primary">{person.name}</p>
                        <p className="text-[10px] text-tertiary uppercase tracking-widest">
                          {assignedItems.length} item{assignedItems.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-[11px] text-secondary uppercase tracking-wider font-bold">Total</p>
                        <p className="font-bold text-[--brand-primary] tabular-nums">Rp {person.total.toLocaleString('id-ID')}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {assignedItems.map(item => {
                        const sharers = persons.filter(p => assignments[p.id]?.[item.id]).length;
                        const share = sharers > 0 ? Math.round(item.price / sharers) : 0;
                        return (
                          <div key={item.id} className="flex justify-between text-xs py-1.5 border-b border dark:border-strong last:border-0">
                            <span className="text-tertiary dark:text-secondary">{item.name}</span>
                            <span className="font-bold text-tertiary dark:text-primary">Rp {share.toLocaleString('id-ID')}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default memo(BillDetailPage);
