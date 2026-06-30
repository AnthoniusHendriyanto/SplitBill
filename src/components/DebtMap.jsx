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
    <div className="w-full bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
      </div>

      <div className="flex items-center gap-3 mb-8 relative z-10">
        <div className="w-8 h-8 rounded-lg bg-brand-primary/10 border border-brand-primary/10 flex items-center justify-center">
            <Icon name="account_tree" className="text-[16px] text-brand-primary" />
        </div>
        <span className="text-[11px] font-bold text-primary uppercase tracking-widest">Settlement Flow</span>
      </div>

      <div className="relative z-10 pl-2 w-full">
         <div className="absolute left-[23px] top-6 bottom-10 w-0.5 bg-gradient-to-t from-brand-primary/30 via-brand-primary to-brand-primary rounded-full" />

         <div className="absolute left-[23px] top-6 bottom-10 w-0.5 overflow-hidden">
             <motion.div
                 initial={{ y: "100%" }}
                 animate={{ y: "-100%" }}
                 transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                  className="w-full h-1/2 bg-gradient-to-t from-transparent via-brand-primary to-transparent"
             />
         </div>

         <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-6 mb-8 relative"
         >
            <div className="relative mt-4">
                <div className="w-4 h-4 rounded-full bg-brand-primary border-4 border-surface-base shadow-md relative z-10"></div>
                <motion.div
                   animate={{ scale: [1, 1.6, 1], opacity: [0.5, 0, 0.5] }}
                   transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                   className="absolute inset-0 bg-brand-primary rounded-full pointer-events-none"
                ></motion.div>
            </div>

            <div className="flex-1 bg-gradient-to-br from-brand-primary to-indigo-600 rounded-2xl p-4 shadow-xl shadow-brand-primary/20 text-white relative overflow-hidden backdrop-blur-md">
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

         {debtors.map((person, idx) => (
             <motion.div
                key={person.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * (idx + 1) }}
                className="flex items-center gap-6 mb-6 relative group"
             >
                <div className="absolute left-[25px] top-1/2 w-6 h-0.5 bg-white/[0.06] group-hover:bg-brand-primary/40 transition-colors pointer-events-none"></div>

                <div className="relative w-4 h-4 rounded-full bg-white/[0.08] border-4 border-surface-base z-10 group-hover:bg-brand-primary transition-colors shadow-sm"></div>

                <div className="flex-1 bg-black/20 rounded-2xl p-4 border border-white/[0.06] shadow-sm flex flex-wrap gap-2 items-center justify-between group-hover:shadow-md group-hover:border-brand-primary/20 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-tertiary group-hover:text-brand-primary group-hover:bg-brand-primary/10 transition-colors">
                            <Icon name="person" className="text-sm" />
                        </div>
                        <div className="font-bold text-sm text-primary">{person.name || '...'}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="text-[9px] uppercase tracking-widest font-bold text-tertiary mb-0.5">Owes</div>
                        <div className="font-black text-[13px] text-red-400">Rp {person.total.toLocaleString('id-ID')}</div>
                    </div>
                </div>
             </motion.div>
         ))}

         {debtors.length === 0 && (
            <div className="flex-1 text-center py-6 text-sm text-tertiary font-medium ml-12 border-2 border-dashed border-white/[0.06] rounded-xl">
               No debt assignments yet.
            </div>
         )}
      </div>
    </div>
  );
}

export default memo(DebtMap);
