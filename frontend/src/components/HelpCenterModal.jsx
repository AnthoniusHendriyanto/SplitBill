import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from './Icon';
import { cn } from '../utils/cn';
import ModalFrame from './ModalFrame';

const capabilities = [
  { icon: 'document_scanner', title: 'AI Receipt Scan', desc: 'Upload a receipt photo and AI extracts items, prices, quantities automatically.' },
  { icon: 'currency_rupee', title: 'IDR Only', desc: 'All amounts in Indonesian Rupiah (Rp). No multi-currency support.' },
  { icon: 'call_split', title: '4 Split Types', desc: 'Equal, By Item (shared_items), Percentage, Custom. Premium unlocks percentage & custom.' },
  { icon: 'people', title: 'Add Participants', desc: 'Add any number of people, select who paid. Saved contacts auto-suggest names.' },
  { icon: 'account_balance', title: 'Payer-as-Bank Model', desc: 'The person who paid is the "bank" — everyone else owes their share to them.' },
  { icon: 'check_circle', title: 'Mark Paid', desc: 'Non-payers can mark individual debts as paid. Bill auto-completes when all settled.' },
  { icon: 'share', title: 'Share Settlement', desc: 'Copy settlement summary or share via WhatsApp with one tap.' },
  { icon: 'receipt_long', title: 'Bill History', desc: 'All finalized bills saved in Dashboard. View details, delete old bills.' },
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
    id: 'ai-accuracy', icon: 'document_scanner',
    title: 'How accurate is the AI OCR?',
    content: 'Highly accurate on clear receipts with good lighting, but can struggle with crumpled receipts, low contrast, or unusual formats. Always verify items and prices in Step 2 before finalizing.',
  },
  {
    id: 'tax-service', icon: 'percent',
    title: 'How are tax and service calculated?',
    content: 'Entered as percentage or fixed Rp amount. They are distributed proportionally by each person\'s item subtotal. The breakdown is shown per person in Step 5 and Bill Details.',
  },
  {
    id: 'split-types', icon: 'call_split',
    title: 'When should I use each split type?',
    content: 'Equal: everyone pays the same. By Item (default): assign each item to specific people, unassigned items split equally. Percentage: each person pays a set %. Custom: assign flat Rp amounts per person.',
  },
  {
    id: 'payment-flow', icon: 'account_balance',
    title: 'How does settlement work?',
    content: 'The payer paid the restaurant. Everyone else owes their calculated share to the payer. Click "Mark Paid" on each person\'s row in Bill Details to record they\'ve settled.',
  },
  {
    id: 'premium-upgrade', icon: 'workspace_premium',
    title: 'How do I upgrade to Premium?',
    content: 'Contact the admin to arrange payment (bank transfer). Once confirmed, admin activates premium via the callback system. No self-service upgrade available yet.',
  },
];

function HelpCenterModal({ open, onClose }) {
  const [activeFaq, setActiveFaq] = useState(null);
  const [tab, setTab] = useState('guide');

  const tabs = [
    { id: 'guide', label: 'Guide' },
    { id: 'limits', label: 'Limitations' },
    { id: 'faq', label: 'FAQ' },
  ];

  return (
    <ModalFrame open={open} onClose={onClose} label="Help Center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-2xl max-h-[85dvh] panel shadow-xl flex flex-col"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-[--border] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[--brand-primary-subtle] border border-[--brand-primary]/20 flex items-center justify-center">
                  <Icon name="help" className="text-base text-[--brand-primary]" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold tracking-tight text-primary">A little help?</h2>
                  <p className="text-sm text-secondary mt-1">Get the most out of your next split.</p>
                </div>
              </div>
              <button onClick={onClose} className="icon-button" aria-label="Close">
                <Icon name="close" className="text-sm" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 px-6 pt-3 pb-2 border-b border-[--border] shrink-0">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-semibold transition-colors cursor-pointer border-none",
                    tab === t.id ? "bg-brand-primary text-[#151714]" : "text-secondary hover:bg-surface-raised"
                  )}
                  aria-pressed={tab === t.id}
                >{t.label}</button>
              ))}
            </div>

            {/* Content */}
            <div tabIndex={0} role="region" aria-label="Help content" className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-[--surface-raised] border border-[--border] rounded-xl p-4 flex gap-3">
                <Icon name="warning" className="text-base text-[--semantic-warning] shrink-0 mt-0.5" />
                <div className="text-[11px] space-y-1 leading-relaxed text-[--text-secondary]">
                  <p className="font-bold text-[--text-primary]">Important Notice</p>
                  <p>This app is a tool to help split bills. AI OCR is advisory — always verify extracted items. Final amounts are calculated from what you confirm in the ledger.</p>
                </div>
              </div>

              {tab === 'guide' && (
                <div className="space-y-2">
                  {capabilities.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-[--border]">
                      <div className="w-7 h-7 rounded-lg bg-[--brand-primary-subtle] border border-[--brand-primary]/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon name={c.icon} className="text-xs text-[--brand-primary]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[--text-primary]">{c.title}</p>
                        <p className="text-[10px] text-[--text-tertiary] mt-0.5">{c.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'limits' && (
                <div className="space-y-2">
                  {limits.map((l, i) => (
                    <div key={i} className="flex items-start gap-3 px-3.5 py-2.5 rounded-xl bg-white/[0.02] border border-[--border]">
                      <div className="w-7 h-7 rounded-lg bg-[--semantic-error-bg] border border-[--semantic-error]/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon name={l.icon} className="text-xs text-[--semantic-error]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[--text-primary]">{l.title}</p>
                        <p className="text-[10px] text-[--text-tertiary] mt-0.5">{l.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'faq' && (
                <div className="space-y-2">
                  {faqs.map((faq) => {
                    const isOpen = activeFaq === faq.id;
                    return (
                      <div key={faq.id} className="rounded-xl border border-[--border] overflow-hidden bg-white/[0.02]">
                        <button aria-expanded={isOpen} onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-[--text-primary] hover:bg-white/[0.04] transition-colors cursor-pointer border-none outline-none"
                        >
                          <span className="flex items-center gap-2.5">
                            <Icon name={faq.icon} className="text-sm text-[--brand-primary]" />
                            {faq.title}
                          </span>
                          <Icon name="expand_more" className={cn("text-sm text-[--text-tertiary] transition-transform", isOpen && "rotate-180")} />
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                              <div className="px-4 pb-4 pt-1 text-[11px] text-[--text-tertiary] leading-relaxed border-t border-[--border] ml-8">{faq.content}</div>
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
    </ModalFrame>
  );
}

export default memo(HelpCenterModal);
