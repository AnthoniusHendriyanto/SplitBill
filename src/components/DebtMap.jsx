import { memo } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';

function DebtMap() {
  const bill = useBillStore((s) => s.bill);
  const calculateTotals = useBillStore((s) => s.calculateTotals);
  const totals = calculateTotals();
  const payer = bill.persons.find(p => p.id === bill.payerId) || bill.persons[0];

  if (!payer || totals.length === 0) return null;
  const debtors = totals.filter(p => p.id !== payer.id);

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-subtle relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.06] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      </div>

      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
            <Icon name="account_tree" className="text-[16px] text-indigo-600 dark:text-indigo-400" />
        </div>
        <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest">Settlement Flow</span>
      </div>

      <div className="relative z-10 pl-2 w-full">
         {/* Main Vertical Trunk */}
         <div className="absolute left-[23px] top-6 bottom-10 w-0.5 bg-gradient-to-t from-slate-200 via-indigo-200 to-indigo-500 dark:from-slate-800 dark:via-indigo-900/50 dark:to-indigo-500 rounded-full" />

         {/* Animated dots flowing UP the trunk */}
         <div className="absolute left-[23px] top-6 bottom-10 w-0.5 overflow-hidden">
             <motion.div 
                 initial={{ y: "100%" }}
                 animate={{ y: "-100%" }}
                 transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                 className="w-full h-1/2 bg-gradient-to-t from-transparent via-indigo-500 to-transparent"
             />
         </div>

         {/* Treasurer Node (Top) */}
         <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-6 mb-8 relative"
         >
            {/* Trunk Node */}
            <div className="relative mt-4">
                <div className="w-4 h-4 rounded-full bg-indigo-600 border-4 border-slate-50 dark:border-slate-900 shadow-md relative z-10"></div>
                <motion.div 
                   animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute inset-0 bg-indigo-500 rounded-full pointer-events-none"
                ></motion.div>
            </div>
            
            {/* Treasurer Card */}
            <div className="flex-1 bg-indigo-600 rounded-2xl p-4 shadow-xl shadow-indigo-500/20 text-white relative overflow-hidden backdrop-blur-md">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/20 shadow-inner">
                           <Icon name="account_balance_wallet" className="text-xl" />
                       </div>
                       <div>
                            <div className="text-[9px] uppercase tracking-widest font-bold text-indigo-200 mb-0.5 flex items-center gap-1">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></div>
                              Payer
                            </div>
                           <div className="font-extrabold text-sm tracking-wide">{payer.name || 'Payer'}</div>
                       </div>
                   </div>
                </div>
            </div>
         </motion.div>

         {/* Debtor Nodes */}
         {debtors.map((person, idx) => (
             <motion.div 
                key={person.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * (idx + 1) }}
                className="flex items-center gap-6 mb-6 relative group"
             >
                {/* Horizontal branch line */}
                <div className="absolute left-[25px] top-1/2 w-6 h-0.5 bg-slate-200 dark:bg-slate-700 group-hover:bg-indigo-300 dark:group-hover:bg-indigo-600 transition-colors pointer-events-none"></div>

                {/* Trunk Node */}
                <div className="relative w-4 h-4 rounded-full bg-slate-300 dark:bg-slate-700 border-4 border-slate-50 dark:border-slate-900 z-10 group-hover:bg-indigo-500 transition-colors shadow-sm"></div>

                {/* Debtor Card */}
                <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap gap-2 items-center justify-between group-hover:shadow-md group-hover:border-indigo-200 dark:group-hover:border-indigo-800 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-colors">
                            <Icon name="person" className="text-sm" />
                        </div>
                        <div className="font-bold text-xs text-slate-700 dark:text-slate-300">{person.name || '...'}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="text-[9px] uppercase tracking-widest font-bold text-slate-500 dark:text-slate-400 mb-0.5">Owes</div>
                        <div className="font-black text-[13px] text-rose-600 dark:text-rose-400">Rp {person.total.toLocaleString('id-ID')}</div>
                    </div>
                </div>
             </motion.div>
         ))}

         {debtors.length === 0 && (
            <div className="flex-1 text-center py-6 text-sm text-slate-500 font-medium ml-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
               No debt assignments yet.
            </div>
         )}
      </div>
    </div>
  );
}

export default memo(DebtMap);
