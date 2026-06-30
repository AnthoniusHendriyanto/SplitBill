import { memo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const faqs = [
  {
    id: 'ai-accuracy',
    icon: 'document_scanner',
    title: 'How accurate is the AI OCR receipt scanner?',
    content: 'Our receipt scanner is highly advanced, but performance depends on photo clarity, lighting, and layout structure. It is designed as an assistant—always verify the items and prices in Step 2 before finalizing your split ledger.'
  },
  {
    id: 'tax-service',
    icon: 'percent',
    title: 'How are tax and service charges calculated?',
    content: 'Tax and service charges are calculated proportionally based on each person\'s subtotal. You can enter tax/service either as a percentage or a direct Rupiah (Rp) amount. The system will automatically show the percentage ratio.'
  },
  {
    id: 'sharing-bills',
    icon: 'share',
    title: 'How do I share the finalized ledger with friends?',
    content: 'Once the bill is finalized in Step 5, you can copy the settlement notes directly to your clipboard, share via Web Share, or share directly on WhatsApp/Telegram. The settlement notes contain detailed peer-to-peer transfer instructions!'
  },
  {
    id: 'payment-gateways',
    icon: 'account_balance_wallet',
    title: 'Which payment gateways/banks are supported?',
    content: 'We support all standard payment gateways and banks, including GoPay, OVO, Dana, LinkAja, BCA, Mandiri, and other local options. You can easily specify your payment details in the settings page.'
  },
  {
    id: 'pwa-offline',
    icon: 'offline_bolt',
    title: 'Can I use SplitMate offline on my phone?',
    content: 'Yes! SplitMate is a Progressive Web App (PWA). You can install it on your Android or iOS device. Once installed, it works offline using cached local storage, allowing you to ledger splits anytime, anywhere.'
  }
];

function HelpCenterModal({ open, onClose }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFaq, setActiveFaq] = useState(null);

  const filteredFaqs = faqs.filter(faq =>
    faq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90]"
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Help Center"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-[450px] max-w-full bg-white dark:bg-surface-elevated border-l border-gray-200 dark:border-gray-800 z-[100] shadow-2xl flex flex-col font-inter"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400 text-2xl">help</span>
                <h2 className="text-xl font-bold text-primary">Help Center & FAQ</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-surface-raised transition-colors cursor-pointer outline-none text-tertiary"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="p-4 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-lg">search</span>
                <input
                  type="text"
                  placeholder="Search help articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-surface-raised border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 flex gap-3 text-amber-800 dark:text-amber-300">
                <span className="material-symbols-outlined text-2xl shrink-0">warning</span>
                <div className="text-xs space-y-1 leading-relaxed">
                  <p className="font-bold">Important Notice & Disclaimer</p>
                  <p>SplitMate uses AI OCR models to parse receipts. While highly accurate, text readability variations, currency formats, and store layouts can sometimes lead to calculation discrepancy. This application is only a help assistant—always review individual breakdowns before settling.</p>
                </div>
              </div>
              <div className="space-y-3">
                {filteredFaqs.length > 0 ? (
                  filteredFaqs.map((faq) => {
                    const isOpen = activeFaq === faq.id;
                    return (
                      <div
                        key={faq.id}
                        className="border border-gray-100 dark:border-gray-800/80 rounded-xl overflow-hidden bg-slate-50 dark:bg-surface-elevated/30"
                      >
                        <button
                          onClick={() => setActiveFaq(isOpen ? null : faq.id)}
                          className="w-full px-4 py-3 flex items-center justify-between text-left font-bold text-sm text-primary hover:bg-slate-100/50 dark:hover:bg-surface-raised/30 transition-colors"
                        >
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-indigo-600/70 dark:text-indigo-400/70 text-lg">{faq.icon}</span>
                            {faq.title}
                          </span>
                          <span className="material-symbols-outlined text-secondary transition-transform duration-200" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                            expand_more
                          </span>
                        </button>
                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 text-xs text-tertiary dark:text-secondary leading-relaxed border-t border-gray-100 dark:border-gray-800/50 mt-1">
                                {faq.content}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 text-tertiary text-xs">
                    No matching FAQ articles found.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default memo(HelpCenterModal);
