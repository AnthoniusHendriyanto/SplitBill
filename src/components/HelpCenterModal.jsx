import { memo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import { cn } from '../utils/cn';

const capabilities = [
  { icon: 'document_scanner', title: 'AI Receipt Scan', desc: 'Upload a receipt photo and AI extracts items, prices, quantities automatically.' },
  { icon: 'currency_rupee', title: 'IDR Only', desc: 'All amounts in Indonesian Rupiah (Rp). No multi-currency support.' },
  { icon: 'call_split', title: '4 Split Types', desc: 'Equal, By Item (shared_items), Percentage, Custom. Premium unlocks percentage & custom.' },
  { icon: 'people', title: 'Add Participants', desc: 'Add any number of people, select who paid. Saved contacts auto-suggest names.' },
  { icon: 'account_balance', title: 'Payer-as-Bank Model', desc: 'The person who paid is the "bank" — everyone else owes their share to them.' },
  { icon: 'check_circle', title: 'Mark Paid', desc: 'Non-payers can mark individual debts as paid. Bill auto-completes when all settled.' },
  { icon: 'share', title: 'Share Settlement', desc: 'Copy settlement summary or share via WhatsApp with one tap.' },
  { icon: 'receipt_long', title: 'Bill History', desc: 'All finalized bills saved in Dashboard. View details, delete old bills.' },
  { icon: 'delete', title: 'Delete Bills', desc: 'Delete any bill from Dashboard history. Cascade removes items, persons, payments.' },
  { icon: 'cloud_off', title: 'Requires Internet', desc: 'No offline mode. Need network connection to save bills and process OCR.' },
];

const limits = [
  { icon: 'workspace_premium', title: 'Free Tier: 50 bills/month', desc: 'Premium: unlimited bills. Contact admin to upgrade (manual payment).' },
  { icon: 'lock', title: 'Percentage & Custom splits need Premium', desc: 'Premium gated. Equal and By Item are free.' },
  { icon: 'link_off', title: 'No shareable links', desc: 'Cannot generate public URLs for bills. Collaborators must log in.' },
  { icon: 'picture_as_pdf', title: 'No PDF/Excel export', desc: 'Export buttons are non-functional. Copy settlement text as workaround.' },
  { icon: 'currency_exchange', title: 'No multi-currency', desc: 'Only IDR supported. No auto-conversion.' },
  { icon: 'sync_disabled', title: 'No offline mode', desc: 'App requires internet. Bills not synced offline.' },
  { icon: 'strikethrough_s', title: 'Stripe not integrated', desc: 'Premium upgrades are manual (bank transfer + admin activation).' },
  { icon: 'edit_off', title: 'No bill editing after finalize', desc: 'Once saved, cannot modify items/persons. Delete and recreate instead.' },
];

const faqs = [
  {
    id: 'ai-accuracy',
    icon: 'document_scanner',
    title: 'How accurate is the AI OCR?',
    content: 'Highly accurate on clear receipts with good lighting, but can struggle with crumpled receipts, low contrast, or unusual formats. Always verify items and prices in Step 2 before finalizing.',
  },
  {
    id: 'tax-service',
    icon: 'percent',
    title: 'How are tax and service calculated?',
    content: 'Entered as percentage or fixed Rp amount. They are distributed proportionally by each person\'s item subtotal. The breakdown is shown per person in Step 5 and Bill Details.',
  },
  {
    id: 'split-types',
    icon: 'call_split',
    title: 'When should I use each split type?',
    content: 'Equal: everyone pays the same. By Item (default): assign each item to specific people, unassigned items split equally. Percentage: each person pays a set %. Custom: assign flat Rp amounts per person.',
  },
  {
    id: 'payment-flow',
    icon: 'account_balance',
    title: 'How does settlement work?',
    content: 'The payer paid the restaurant. Everyone else owes their calculated share to the payer. Click "Mark Paid" on each person\'s row in Bill Details to record they\'ve settled. The person\'s name, bank details are for reference.',
  },
  {
    id: 'premium-upgrade',
    icon: 'workspace_premium',
    title: 'How do I upgrade to Premium?',
    content: 'Contact the admin to arrange payment (bank transfer). Once confirmed, admin activates premium via the callback system. No self-service upgrade available yet.',
  },
];

function HelpCenterModal({ open, onClose }) {
  const [activeFaq, setActiveFaq] = useState(null);
  const [tab, setTab] = useState('guide');
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement;
    const modal = modalRef.current;
    const handler = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'Tab' && modal) {
        const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    };
  }, [open, onClose]);

  const tabs = [
    { id: 'guide', label: 'Guide' },
    { id: 'limits', label: 'Limitations' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90]"
            aria-hidden="true"
          />
          <motion.div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Help Center"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-surface-elevated/80 backdrop-blur-xl border-l border-white/[0.04] z-[100] shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-white/[0.04] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-indigo-500/10 border border-brand-primary/20 flex items-center justify-center shadow-[0_0_12px_var(--brand-primary-glow)]">
                  <Icon name="help" className="text-lg text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-primary tracking-tight">Help Center</h2>
                  <p className="text-[10px] text-tertiary font-medium">Guide, limitations & FAQ</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center transition-all cursor-pointer outline-none text-tertiary hover:text-primary"
                aria-label="Close"
              >
                <Icon name="close" className="text-sm" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-4 pb-2 border-b border-white/[0.04] shrink-0">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-[10px] font-semibold tracking-wide transition-all cursor-pointer border-none outline-none",
                    tab === t.id
                      ? "bg-brand-primary/10 text-brand-primary shadow-sm"
                      : "text-tertiary hover:text-secondary hover:bg-white/[0.04]"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">

              {/* Disclaimer */}
              <div className="bg-amber-950/15 backdrop-blur-sm border border-amber-500/15 rounded-2xl p-4 flex gap-3">
                <Icon name="warning" className="text-lg text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-1 leading-relaxed text-amber-200/80">
                  <p className="font-bold text-amber-300">Important Notice</p>
                  <p>This app is a tool to help split bills. AI OCR is advisory — always verify extracted items. Final amounts are calculated from what you confirm in the ledger, not the OCR output.</p>
                </div>
              </div>

              {/* TAB: Guide */}
              {tab === 'guide' && (
                <div className="space-y-3">
                  <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider">What You Can Do</p>
                  <div className="grid gap-2">
                    {capabilities.map((c, i) => (
                      <div key={i} className="flex items-start gap-3 px-3.5 py-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-brand-primary/10 border border-brand-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon name={c.icon} className="text-xs text-brand-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary">{c.title}</p>
                          <p className="text-[10px] text-tertiary leading-relaxed mt-0.5">{c.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: Limitations */}
              {tab === 'limits' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400/60" />
                    <p className="text-[10px] font-semibold text-red-400/80 uppercase tracking-wider">Known Limitations</p>
                  </div>
                  <div className="grid gap-2">
                    {limits.map((l, i) => (
                      <div key={i} className="flex items-start gap-3 px-3.5 py-2.5 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                        <div className="w-7 h-7 rounded-lg bg-red-950/30 border border-red-500/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Icon name={l.icon} className="text-xs text-red-400/70" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary">{l.title}</p>
                          <p className="text-[10px] text-tertiary leading-relaxed mt-0.5">{l.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: FAQ */}
              {tab === 'faq' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-tertiary uppercase tracking-wider mb-3">Frequently Asked Questions</p>
                  {faqs.map((faq) => {
                    const isOpen = activeFaq === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="rounded-2xl border border-white/[0.04] overflow-hidden bg-white/[0.02]"
                      >
                        <button
                          onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-primary hover:bg-white/[0.04] transition-colors cursor-pointer border-none outline-none"
                        >
                          <span className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-brand-primary/10 border border-brand-primary/15 flex items-center justify-center">
                              <Icon name={faq.icon} className="text-[11px] text-brand-primary" />
                            </span>
                            {faq.title}
                          </span>
                          <Icon name="expand_more" className={cn("text-sm text-tertiary transition-transform duration-200", isOpen && "rotate-180")} />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 text-[11px] text-tertiary leading-relaxed border-t border-white/[0.04] mt-1 ml-12">
                                {faq.content}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default memo(HelpCenterModal);
