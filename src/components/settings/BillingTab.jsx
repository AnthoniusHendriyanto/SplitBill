import { motion } from 'framer-motion';
import Icon from '../Icon';

export default function BillingTab({ tier, ocrUsage }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h3 className="text-sm font-black uppercase text-white tracking-widest flex items-center gap-2 mb-1">
          <Icon name="credit_card" className="text-indigo-400 text-base" />
          Billing & Subscription
        </h3>
        <p className="text-[10px] text-slate-500 font-semibold">Manage your current quota plan, OCR scans consumption, and PDF exports limits.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card-alt border border-slate-900 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[160px] group shadow-premium">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
          <div>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Active Quota Level</span>
            <h4 className="text-xl font-black text-white flex items-center gap-2">
              {tier === 'premium' ? 'Pro' : 'Free'} Tier
              <span className="text-[8px] font-bold text-indigo-400 bg-indigo-950/60 border border-indigo-900/30 px-2 py-0.5 rounded uppercase tracking-widest">Active</span>
            </h4>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">{tier === 'premium' ? 'Enjoy unlimited OCR scans and premium features.' : 'Upgrade to lift all OCR scanning limits and unlock export tools.'}</p>
          </div>
          <span className="text-[10px] font-extrabold text-indigo-400 uppercase tracking-wider block mt-4">{tier === 'premium' ? 'Rp 39.000 / month' : 'Rp 0 / month'}</span>
        </div>
        <div className="bg-card-alt border border-slate-900 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-premium">
          <div className="space-y-2">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">OCR SCAN CONSUMPTION</span>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-black text-white font-numeric">
                {tier === 'premium' ? '\u221E' : (ocrUsage?.current ?? 0)}{' '}
                {tier !== 'premium' && <span className="text-xs font-semibold text-slate-500">/ {ocrUsage?.limit ?? 10} scans</span>}
              </span>
              {tier !== 'premium' && (
                <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded uppercase tracking-wider">
                  {ocrUsage ? Math.round((1 - (ocrUsage.current / (ocrUsage.limit || 1))) * 100) + '% remaining' : '...'}
                </span>
              )}
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: tier === 'premium' ? '100%' : (ocrUsage ? `${Math.min((ocrUsage.current / (ocrUsage.limit || 1)) * 100, 100)}%` : '0%') }} />
            </div>
          </div>
          <div className="space-y-2 pt-3 border-t border-slate-950">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">PDF EXPORT LIMITS</span>
            <div className="flex justify-between items-end">
              <span className="text-2xl font-black text-white font-numeric">
                {tier === 'premium' ? '\u221E' : '1'}{' '}
                {tier !== 'premium' && <span className="text-xs font-semibold text-slate-500">/ 3 exports</span>}
              </span>
              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 px-2 py-0.5 rounded uppercase tracking-wider">{tier === 'premium' ? 'Unlimited' : '66% remaining'}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full" style={{ width: tier === 'premium' ? '100%' : '33%' }} />
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 bg-gradient-to-br from-indigo-950/20 via-indigo-900/10 to-card border border-indigo-950/60 rounded-2xl relative overflow-hidden shadow-premium">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" />
        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1.5">★ Upgrade to SplitMate Pro</h4>
        <h3 className="text-lg font-black text-white leading-tight mb-2">Unlock Unlimited Receipt Scans & Advanced Group Financial Intelligence</h3>
        <ul className="space-y-1.5 text-[10px] text-slate-400 font-semibold mb-6 mt-4">
          <li className="flex items-center gap-2"><Icon name="check" className="text-indigo-400 text-xs" /> Unlimited live AI OCR receipt scanning</li>
          <li className="flex items-center gap-2"><Icon name="check" className="text-indigo-400 text-xs" /> High-fidelity PDF & Excel reports exports</li>
          <li className="flex items-center gap-2"><Icon name="check" className="text-indigo-400 text-xs" /> Direct automated WhatsApp settlements reminding API</li>
          <li className="flex items-center gap-2"><Icon name="check" className="text-indigo-400 text-xs" /> Advanced group spending statistics and CSV tools</li>
        </ul>
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all border-none outline-none cursor-pointer shadow-lg shadow-indigo-600/25 active:scale-95 animate-pulse">
            Get SplitMate Pro (Rp 39.000 / mo)
          </button>
          <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Cancel anytime • 14 day free trial</span>
        </div>
      </div>
    </motion.div>
  );
}
