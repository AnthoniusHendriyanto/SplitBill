import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import PriceInput from './PriceInput';
import QuantityInput from './QuantityInput';
import ReceiptSummary from './ReceiptSummary';
import ReceiptViewer from './ReceiptViewer';
import Icon from './Icon';
import { cn } from '../utils/cn';

function Step2Ledger({
  receiptSubtotal, receiptService, receiptTax, receiptGrandTotal, setStep
}) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const resetBill = useBillStore((s) => s.resetBill);
  const addItem = useBillStore((s) => s.addItem);
  const updateItem = useBillStore((s) => s.updateItem);
  const removeItem = useBillStore((s) => s.removeItem);
  const [receiptCollapsed, setReceiptCollapsed] = useState(() => !bill.imageUrl || window.matchMedia('(max-width: 1279px)').matches);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);

  const handleItemUpdate = useCallback((itemId, fields) => {
    const item = bill.items.find(i => i.id === itemId);
    if (!item) return;
    const newQty = fields.qty !== undefined ? fields.qty : (item.qty || 1);
    const newUnitPrice = fields.unitPrice !== undefined ? fields.unitPrice : (item.unitPrice || item.price || 0);
    updateItem(itemId, {
      ...fields,
      qty: newQty,
      unitPrice: newUnitPrice,
      price: newQty * newUnitPrice
    });
  }, [bill.items, updateItem]);

  const handleAddItemInline = useCallback(() => {
    addItem();
    setTimeout(() => {
      const currentItems = useBillStore.getState().bill.items;
      const lastItem = currentItems[currentItems.length - 1];
      if (lastItem) {
        updateItem(lastItem.id, { qty: 1, unitPrice: 0, price: 0 });
      }
    }, 30);
  }, [addItem, updateItem]);

  const handleRerunOCR = useCallback(() => {
    resetBill();
    setStep(1);
  }, [resetBill, setStep]);

  const handleSaveDraft = useCallback(() => {
    setSaveFeedback('Your edits are saved on this device. Finalize the split to save it to your account.');
    setTimeout(() => setSaveFeedback(null), 3000);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col xl:flex-row gap-6 w-full flex-1"
    >
      {/* Receipt Preview — 25% */}
      <div className={cn(
        "w-full xl:w-[280px] flex-shrink-0 transition-all duration-300",
        receiptCollapsed && "xl:w-16"
      )}>
        <div className={cn(
          "bg-[--surface-elevated] border border-[--border] rounded-2xl shadow-card relative sticky top-0",
          !receiptCollapsed && "overflow-hidden"
        )}>
          {/* Collapse / Expand toggle */}
          {receiptCollapsed ? (
            <button
              onClick={() => setReceiptCollapsed(false)}
              className="w-full h-full min-h-16 xl:min-h-[200px] flex items-center justify-center rounded-2xl bg-transparent hover:bg-surface-raised transition-colors text-secondary cursor-pointer"
              title="Show receipt preview"
            >
              <div className="flex xl:flex-col items-center gap-2">
                <Icon name="keyboard_arrow_right" className="text-lg" />
                <span className="text-xs font-semibold xl:[writing-mode:vertical-rl]">Receipt & details</span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => setReceiptCollapsed(true)}
              aria-label="Collapse receipt preview"
              className="absolute top-1 right-1 z-20 icon-button"
            >
              <Icon name="keyboard_arrow_left" className="text-sm" />
            </button>
          )}

          {!receiptCollapsed && (
            <>
              {/* Header */}
              <div className="p-5 border-b border-white/[0.04]">
                <h3 className="text-xs font-semibold text-primary flex items-center gap-2">
                  <Icon name="document_scanner" className="text-brand-primary text-sm" />
                  Receipt Preview
                  {bill.ocrConfidence > 0 && (
                    <span className="text-[9px] font-bold text-[--brand-primary]/80 bg-[--brand-primary-subtle] px-2 py-0.5 rounded-md ml-auto">
                      AI {Math.round(bill.ocrConfidence)}%
                    </span>
                  )}
                </h3>
                {bill.imageUrl && (
                  <div className="flex gap-1.5 mt-2">
                    <button onClick={handleRerunOCR}
                      className="p-1.5 bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-tertiary hover:text-secondary rounded-lg transition-colors cursor-pointer border-none outline-none"
                      title="Scan a different receipt"
                    >
                      <Icon name="autorenew" className="text-sm" />
                    </button>
                  </div>
                )}
              </div>

              {/* Receipt image or styled view */}
              <div className="overflow-y-auto max-h-[320px] hide-scrollbar">
                {bill.imageUrl ? (
                  <div className="p-3">
                    <ReceiptViewer src={bill.imageUrl} alt="Receipt" className="w-full h-[320px]" />
                  </div>
                ) : (
                  <div className="p-4 bg-black/20 mx-3 my-3 rounded-2xl border border-white/[0.04] min-h-[200px] flex flex-col justify-between">
                    <div className="text-center mt-3">
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">{bill.title || "MANUAL LEDGER"}</p>
                      <p className="text-[8px] text-tertiary mt-1 font-medium uppercase tracking-widest">
                        {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                      </p>
                    </div>
                    <div className="space-y-1.5 mt-4">
                      {bill.items.slice(0, 6).map(item => {
                        const qty = item.qty ?? item.quantity ?? 1;
                        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.price;
                        return (
                          <div key={item.id} className="flex justify-between text-[10px] font-medium text-secondary">
                            <span className="truncate max-w-[100px]">{item.name || "Item"}</span>
                            <span className="text-primary font-numeric">Rp {(qty * unitPrice).toLocaleString('id-ID')}</span>
                          </div>
                        );
                      })}
                    </div>
                    {bill.items.length > 6 && (
                      <p className="text-[9px] text-tertiary text-center mt-2">+{bill.items.length - 6} more items</p>
                    )}
                  </div>
                )}
              </div>

              {/* Bill Details */}
              <div className="p-5 border-t border-white/[0.04] space-y-4">
                <h4 className="text-[10px] font-semibold text-tertiary uppercase tracking-wider flex items-center gap-1.5">
                  <Icon name="info" className="text-xs" />
                  Bill Details
                </h4>
                <div>
                  <label htmlFor="ledger-merchant" className="text-sm font-medium text-secondary block mb-2">Merchant</label>
                  <input
                    id="ledger-merchant"
                    value={bill.title}
                    onChange={(e) => updateBill({ title: e.target.value })}
                    className="w-full h-9 px-3 bg-black/20 border border-white/[0.06] rounded-xl text-xs font-medium text-primary placeholder:text-tertiary/60 transition-all hover:border-white/[0.12] focus:border-brand-primary/50 focus:shadow-[0_0_0_1px_var(--brand-primary)] focus:outline-none"
                    placeholder="Restaurant or store name"
                  />
                </div>
                <div>
                  <label htmlFor="ledger-date" className="text-sm font-medium text-secondary block mb-2">Date</label>
                  <input id="ledger-date" type="date" value={bill.date || new Date().toISOString().slice(0, 10)}
                    onChange={(e) => updateBill({ date: e.target.value })}
                    className="w-full h-11 px-3 bg-surface-base border border-border-strong rounded-xl text-sm text-primary"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bill Items — 75% */}
      <div className="min-w-0 flex-1 receipt-panel flex flex-col overflow-hidden relative">
        <AnimatePresence>
          {saveFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[--brand-primary-subtle] border border-[--brand-primary]/20 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2 text-[--brand-primary] font-semibold text-xs"
              role="status" aria-live="polite"
            >
              <Icon name="check_circle" className="text-sm" />
              {saveFeedback}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="p-5 border-b border-white/[0.04] flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-primary">
              Receipt Items
            </h2>
            <p className="text-[11px] text-secondary mt-0.5">Review, edit or add missing items.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRerunOCR}
              className="h-8 px-3 rounded-xl bg-transparent hover:bg-white/[0.04] border border-white/[0.06] text-tertiary hover:text-secondary text-[10px] font-medium transition-all flex items-center gap-1.5 cursor-pointer outline-none"
            >
              <Icon name="autorenew" className="text-xs" /> Scan Different Receipt
            </button>
            <button onClick={handleSaveDraft}
              className="h-8 px-3 rounded-xl bg-transparent hover:bg-white/[0.04] border border-white/[0.06] text-tertiary hover:text-secondary text-[10px] font-medium transition-all flex items-center gap-1.5 cursor-pointer outline-none"
            >
              <Icon name="save" className="text-xs" /> Save status
            </button>
          </div>
        </div>

        {/* Items Table or Empty State */}
        <div className="overflow-y-auto flex-1 hide-scrollbar">
          {bill.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8">
              <div className="w-20 h-20 rounded-3xl bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center mb-5">
                <Icon name="receipt_long" className="text-4xl text-brand-primary/40" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-1">No items found yet</h3>
              <p className="text-xs text-secondary max-w-[280px] leading-relaxed mb-6">
                Upload a receipt or manually add items to start building your bill.
              </p>
              <div className="flex gap-3">
                <button onClick={handleAddItemInline}
                  className="h-10 px-5 bg-[--brand-primary] hover:bg-[--brand-primary-hover] active:scale-[0.98] rounded-xl text-xs font-bold text-[--text-inverse] shadow-sm transition-all duration-150 flex items-center gap-2 cursor-pointer border-none outline-none"
                >
                  <Icon name="add" className="text-sm" /> Add First Item
                </button>
                <button onClick={handleRerunOCR}
                  className="h-10 px-5 bg-transparent hover:bg-white/[0.04] border border-white/[0.06] rounded-2xl text-xs font-medium text-secondary hover:text-primary transition-all duration-200 flex items-center gap-2 cursor-pointer outline-none"
                >
                  <Icon name="cloud_upload" className="text-sm" /> Scan Different Receipt
                </button>
              </div>
            </div>
          ) : (
            <>
              <table className="ledger-table w-full border-collapse" aria-label="Receipt items">
                <thead>
                  <tr className="border-b border-white/[0.04] text-left">
                    <th scope="col" className="px-5 py-3 text-[9px] font-semibold text-tertiary uppercase tracking-wider">Item</th>
                    <th scope="col" className="px-5 py-3 text-[9px] font-semibold text-tertiary uppercase tracking-wider text-center w-24">Qty</th>
                    <th scope="col" className="px-5 py-3 text-[9px] font-semibold text-tertiary uppercase tracking-wider text-right w-36">Price</th>
                    <th scope="col" className="px-5 py-3 text-[9px] font-semibold text-tertiary uppercase tracking-wider text-right w-32">Total</th>
                    <th scope="col" className="px-5 py-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  <AnimatePresence>
                    {bill.items.map((item) => {
                      const qty = item.qty ?? item.quantity ?? 1;
                      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.price;
                      const rowTotal = qty * unitPrice;
                      return (
                        <motion.tr
                          key={item.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0, scale: 0.98 }}
                          onMouseEnter={() => setHoveredRowId(item.id)}
                          onMouseLeave={() => setHoveredRowId(null)}
                          className={cn(
                            "transition-colors",
                            hoveredRowId === item.id ? "bg-brand-primary/[0.03]" : "hover:bg-white/[0.02]"
                          )}
                        >
                          <td className="px-5 py-3.5">
                            <input
                              aria-label="Item name"
                              value={item.name}
                              onChange={(e) => handleItemUpdate(item.id, { name: e.target.value })}
                              className="w-full bg-transparent border-none outline-none text-sm font-medium text-primary placeholder:text-tertiary/40 focus:outline-none"
                              placeholder="Item name"
                            />
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <QuantityInput value={qty} min={1} className="max-w-[104px] mx-auto"
                              onChange={(v) => handleItemUpdate(item.id, { qty: v })}
                            />
                          </td>
                          <td className="px-5 py-3.5 text-right w-36">
                            <PriceInput variant="ghost" value={unitPrice} label={`Unit price for ${item.name || 'item'}`}
                              onChange={(val) => handleItemUpdate(item.id, { unitPrice: val })}
                              className="text-right font-medium text-primary text-sm"
                            />
                          </td>
                          <td className="px-5 py-3.5 text-right font-semibold font-numeric text-brand-primary text-sm w-32">
                            Rp {rowTotal.toLocaleString('id-ID')}
                          </td>
                          <td className="px-5 py-3.5 text-center w-10">
                            <button onClick={() => removeItem(item.id)}
                              className={cn(
                                "icon-button hover:text-error",
                                hoveredRowId === item.id ? "text-error" : "text-tertiary"
                              )}
                              title="Remove item"
                            >
                              <Icon name="delete" className="text-base" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>

              {/* Add item button */}
              <div className="px-5 py-3 border-t border-white/[0.03]">
                <button onClick={handleAddItemInline}
                  className="w-full py-3 rounded-2xl border border-dashed border-white/[0.06] hover:border-brand-primary/30 bg-transparent hover:bg-brand-primary/[0.02] text-tertiary hover:text-brand-primary text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer outline-none"
                >
                  <Icon name="add" className="text-sm" /> Add Item
                </button>
              </div>
            </>
          )}
        </div>

        {/* Financial Summary */}
        {bill.items.length > 0 && (
          <div className="px-5 py-4 border-t border-white/[0.04]">
            <ReceiptSummary
              subtotal={receiptSubtotal}
              discount={bill.discountMode === 'percent' ? Math.round(receiptSubtotal * (bill.discount ?? 0) / 100) : (bill.discount ?? 0)}
              onDiscountChange={(v) => updateBill({ discount: Math.max(0, v), discountMode: 'amount' })}
              tax={receiptTax}
              onTaxChange={(v) => updateBill({ tax: v, taxMode: 'amount' })}
              serviceCharge={receiptService}
              onServiceChange={(v) => updateBill({ serviceCharge: v, serviceMode: 'amount' })}
              grandTotal={receiptGrandTotal}
            />
          </div>
        )}

        {/* Footer — Continue */}
        <div className="px-5 pb-5 pt-2">
          <button onClick={() => setStep(3)} disabled={bill.items.length === 0}
            className="btn-primary w-full"
          >
            Continue
            <Icon name="arrow_forward" className="text-sm" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(Step2Ledger);
