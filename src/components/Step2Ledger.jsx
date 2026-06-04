import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import PriceInput from './PriceInput';
import Icon from './Icon';
import { cn } from '../utils/cn';

function Step2Ledger({
  receiptSubtotal, receiptService, receiptTax, receiptGrandTotal,
  handleServiceModeChange, handleTaxModeChange, setStep
}) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const addItem = useBillStore((s) => s.addItem);
  const updateItem = useBillStore((s) => s.updateItem);
  const removeItem = useBillStore((s) => s.removeItem);
  const [receiptTab, setReceiptTab] = useState('original');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [billBackup, setBillBackup] = useState(null);
  const [saveFeedback, setSaveFeedback] = useState(null);
  const [hoveredRowId, setHoveredRowId] = useState(null);

  useEffect(() => {
    if (billBackup || bill.items.length === 0) return;
    const timer = setTimeout(() => setBillBackup(structuredClone(bill)), 0);
    return () => clearTimeout(timer);
  }, [billBackup, bill]);

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
    setStep(1);
  }, [setStep]);

  const handleUndo = useCallback(() => {
    if (billBackup) {
      updateBill(structuredClone(billBackup));
      setSaveFeedback('Reverted all changes to initial snapshot');
      setTimeout(() => setSaveFeedback(null), 3000);
    }
  }, [billBackup, updateBill]);

  const handleSaveDraft = useCallback(() => {
    setSaveFeedback('Ledger draft saved successfully!');
    setTimeout(() => setSaveFeedback(null), 3000);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex flex-col xl:flex-row gap-8 w-full flex-1"
    >
      <div className="w-full xl:w-[420px] bg-card/80 border border-slate-900 rounded-2xl flex flex-col group relative shadow-premium overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        {bill.imageUrl ? (
          <div className="p-4 border-b border-slate-900 flex bg-slate-950/20 items-center justify-between">
            <div className="flex bg-slate-950 p-1 rounded-xl w-3/4 border border-slate-900">
              <button
                onClick={() => setReceiptTab('original')}
                className={cn(
                  "flex-1 py-1.5 px-3 text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none outline-none",
                  receiptTab === 'original' ? "bg-slate-900 text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-350"
                )}
              >
                <Icon name="photo_library" className="text-xs" /> Original
              </button>
              <button
                onClick={() => setReceiptTab('ledger')}
                className={cn(
                  "flex-1 py-1.5 px-3 text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none outline-none",
                  receiptTab === 'ledger' ? "bg-slate-900 text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-355"
                )}
              >
                <Icon name="receipt_long" className="text-xs" /> Ledger View
              </button>
            </div>
            {receiptTab === 'original' && (
              <button
                onClick={() => setZoomLevel(prev => prev === 1 ? 1.6 : 1)}
                className="p-2 bg-slate-950 hover:bg-slate-900 border border-slate-900 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title={zoomLevel === 1 ? "Zoom In Receipt" : "Zoom Out Receipt"}
              >
                <Icon name={zoomLevel === 1 ? "zoom_in" : "zoom_out"} className="text-sm" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-6 border-b border-slate-900 flex justify-between items-center bg-slate-950/20">
            <h3 className="font-bold text-white flex items-center gap-2 text-sm">
              <Icon name="document_scanner" className="text-indigo-400" />
              Receipt Ledger
            </h3>
            <span className="text-[9px] font-bold text-indigo-455 bg-indigo-950/50 border border-indigo-900/30 px-2 py-0.5 rounded uppercase tracking-wider">Manual entry</span>
          </div>
        )}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-950/30 flex flex-col gap-6 hide-scrollbar">
          {(!bill.imageUrl || receiptTab === 'ledger') ? (
            <div className="bg-card-alt p-6 shadow-2xl rounded-xl border border-slate-900 min-h-[460px] flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-indigo-500 opacity-60"></div>
              <div className="text-center mb-6 mt-2">
                <p className="font-black text-sm uppercase tracking-[0.25em] text-white leading-tight">{bill.title || "SPLITMATE LEDGER"}</p>
                <p className="text-[8px] text-indigo-400/80 font-bold mt-2 uppercase tracking-widest bg-indigo-950/30 border border-indigo-900/20 py-1 px-3 rounded-full inline-block">
                  RECEIPT • {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }).toUpperCase()}
                </p>
              </div>
              <div className="space-y-3 flex-1 mt-6">
                {bill.items.map(item => {
                  const qty = item.qty || 1;
                  const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.price;
                  return (
                    <div key={item.id} className="flex justify-between text-[11px] py-2.5 border-b border-slate-900 border-dashed font-semibold font-numeric">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] text-slate-500 bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded font-bold">{qty}x</span>
                        <span className="text-slate-400 uppercase text-[9px] tracking-wider font-bold max-w-[160px] truncate">{item.name || "UNNAMED ITEM"}</span>
                      </div>
                      <span className="text-slate-200">Rp {(qty * unitPrice).toLocaleString('id-ID')}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-8 pt-4 border-t border-slate-900 space-y-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest font-numeric">
                <div className="flex justify-between items-center">
                  <span>Subtotal</span>
                  <span className="text-slate-350 text-xs font-bold">Rp {receiptSubtotal.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Service Charge</span>
                  <span className="text-slate-355 text-xs font-bold">Rp {receiptService.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Tax / PB1</span>
                  <span className="text-slate-360 text-xs font-bold">Rp {receiptTax.toLocaleString('id-ID')}</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t-2 border-slate-900 border-double flex justify-between items-center font-numeric">
                <span className="font-black text-xs tracking-wider text-slate-400">GRAND TOTAL</span>
                <span className="text-lg font-black text-indigo-400">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span>
              </div>
            </div>
          ) : (
            <div className="bg-card-alt p-2 shadow-xl rounded-xl border border-slate-900 flex flex-col gap-3 min-h-[460px] justify-center items-center relative overflow-hidden group/image">
              <div className="w-full h-full min-h-[420px] max-h-[460px] flex items-center justify-center overflow-auto rounded-lg hide-scrollbar relative">
                <img
                  src={bill.imageUrl}
                  alt="Original Receipt"
                  className="max-w-full h-auto object-contain max-h-[440px] rounded-lg transition-transform duration-350 ease-out origin-center"
                  style={{ transform: `scale(${zoomLevel})` }}
                />
              </div>
            </div>
          )}
          <div className="bg-card-alt p-5 shadow-xl rounded-xl border border-slate-900 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-900">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <Icon name="settings" className="text-xs text-indigo-400" />
                Metadata Parameters
              </span>
            </div>
            <div className="space-y-4">
              <div className="relative group">
                <label htmlFor="ledger-title" className="absolute -top-2 left-3 px-1.5 bg-card-alt text-[9px] font-bold text-indigo-400 uppercase tracking-widest z-10 transition-colors group-focus-within:text-purple-400">
                  Restaurant Name
                </label>
                <input
                  id="ledger-title"
                  value={bill.title}
                  onChange={(e) => updateBill({ title: e.target.value })}
                  className="w-full px-3 py-2.5 bg-slate-950/50 border border-slate-905 focus:border-indigo-500 rounded-lg outline-none font-bold text-xs md:text-sm text-white transition-colors"
                  placeholder="e.g. Kopikina Cilandak"
                />
              </div>
              <div className="text-[9px] text-slate-500 font-semibold text-center">
                {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 bg-card/80 border border-slate-900 rounded-2xl shadow-premium flex flex-col overflow-hidden backdrop-blur-md relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
        <div className="p-6 border-b border-slate-900 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-950/20">
          <div>
            <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
              Detected Ledger Rows
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-1">Review, edit, or adjust items extracted by SplitMate AI</p>
            {bill.ocrConfidence > 0 && (
              <div className="flex items-center gap-1.5 mt-2">
                <div className={cn(
                  "h-1.5 w-16 rounded-full overflow-hidden bg-slate-800",
                )}>
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      bill.ocrConfidence >= 80 ? "bg-emerald-500" : bill.ocrConfidence >= 50 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${bill.ocrConfidence}%` }}
                  />
                </div>
                <span className={cn(
                  "text-[10px] font-bold",
                  bill.ocrConfidence >= 80 ? "text-emerald-400" : bill.ocrConfidence >= 50 ? "text-amber-400" : "text-rose-400"
                )}>
                  {Math.round(bill.ocrConfidence)}%
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button onClick={handleUndo} disabled={!billBackup}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-955 border border-slate-900 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
              title="Undo all changes since mounting"
            >
              <Icon name="undo" className="text-xs" /> Undo
            </button>
            <button onClick={handleRerunOCR}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-955 border border-slate-900 hover:bg-slate-900 text-slate-350 hover:text-white font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
            >
              <Icon name="autorenew" className="text-xs text-purple-400" /> Re-scan
            </button>
            <button onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-950/40 border border-indigo-900/40 hover:bg-indigo-900/35 text-indigo-400 hover:text-indigo-300 font-extrabold text-[10px] uppercase tracking-wider transition-all cursor-pointer"
            >
              <Icon name="save" className="text-xs" /> Save Draft
            </button>
          </div>
        </div>
        <AnimatePresence>
          {saveFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-20 left-1/2 -translate-x-1/2 z-50 bg-emerald-950/90 backdrop-blur-md border border-emerald-500/50 rounded-xl px-4 py-2.5 shadow-2xl flex items-center gap-2 text-emerald-400 font-bold text-xs"
              role="status" aria-live="polite"
            >
              <Icon name="check_circle" className="text-sm animate-bounce" />
              {saveFeedback}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="overflow-y-auto flex-1 hide-scrollbar bg-slate-950/10 min-h-[300px]">
          {bill.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-8">
              <Icon name="receipt_long" className="text-5xl text-slate-800 mb-4" />
              <p className="text-sm font-bold text-slate-500 mb-1">No items yet</p>
              <p className="text-[10px] text-slate-600 mb-6">Upload a receipt or add items manually below.</p>
            </div>
          ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-900 text-left sticky top-0 z-10 backdrop-blur-md">
                <th scope="col" className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest">Item Description</th>
                <th scope="col" className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center w-28">Qty</th>
                <th scope="col" className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right w-40">Unit Price</th>
                <th scope="col" className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-right w-36">Row Total</th>
                <th scope="col" className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest text-center w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900 font-semibold text-xs">
              <AnimatePresence>
                {bill.items.map((item) => {
                  const qty = item.qty || 1;
                  const unitPrice = item.unitPrice !== undefined ? item.unitPrice : item.price;
                  const calculatedRowTotal = qty * unitPrice;
                  return (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      onMouseEnter={() => setHoveredRowId(item.id)}
                      onMouseLeave={() => setHoveredRowId(null)}
                      className={cn(
                        "transition-colors group border-b border-slate-900/50",
                        hoveredRowId === item.id ? "bg-indigo-950/15" : "hover:bg-slate-950/20"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {qty === 1 && unitPrice === 0 && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" title="Low OCR confidence warning: complete item values"></span>
                          )}
                          <input
                            value={item.name}
                            onChange={(e) => handleItemUpdate(item.id, { name: e.target.value })}
                            className="w-full bg-transparent border-none focus:ring-0 font-bold text-white p-0 text-xs md:text-sm outline-none placeholder-slate-700 focus:border-b focus:border-indigo-500/50 transition-all"
                            placeholder="e.g. Wagyu Ribeye Steak"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center w-28">
                        <div className="flex items-center justify-between bg-slate-950 px-1 py-1 rounded-lg border border-slate-900 max-w-[90px] mx-auto group-hover:border-slate-800 transition-colors">
                      <button type="button" aria-label="Decrease quantity"
                        onClick={() => handleItemUpdate(item.id, { qty: Math.max(1, qty - 1) })}
                            className="w-5 h-5 flex items-center justify-center bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-500 rounded border-none cursor-pointer font-extrabold text-[10px] transition-colors"
                          >-</button>
                          <span className="text-xs font-black text-white font-numeric">{qty}</span>
                      <button type="button" aria-label="Increase quantity"
                        onClick={() => handleItemUpdate(item.id, { qty: qty + 1 })}
                            className="w-5 h-5 flex items-center justify-center bg-slate-900 hover:bg-slate-850 hover:text-white text-slate-500 rounded border-none cursor-pointer font-extrabold text-[10px] transition-colors"
                          >+</button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right w-40">
                        <PriceInput variant="ghost" value={unitPrice}
                          onChange={(val) => handleItemUpdate(item.id, { unitPrice: val })}
                          className="text-right font-bold text-slate-200 text-xs md:text-sm focus-within:text-white"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-bold font-numeric text-indigo-400 text-xs md:text-sm w-36">
                        Rp {calculatedRowTotal.toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 text-center w-12">
                        <button onClick={() => removeItem(item.id)}
                          className="text-slate-600 hover:text-rose-500 focus-visible:text-rose-500 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-all border-none bg-transparent cursor-pointer outline-none"
                          title="Remove Item Row"
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
          )}
          <div className="p-4 border-t border-dashed border-slate-900">
            <button onClick={handleAddItemInline}
              className="w-full py-3.5 rounded-xl border border-dashed border-slate-900 hover:border-indigo-500/40 bg-slate-950/20 hover:bg-indigo-950/5 text-slate-400 hover:text-indigo-400 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer border-none"
            >
              <Icon name="add" className="text-sm" /> Add Item Manually Inline
            </button>
          </div>
        </div>
        <div className="p-6 bg-slate-950/90 backdrop-blur-md flex flex-col gap-5 border-t border-slate-900 sticky bottom-0 z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2 border-b border-dashed border-slate-900">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="service-charge-input" className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Service Charge</label>
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-900">
                  <button onClick={() => handleServiceModeChange('percent')}
                    className={cn("px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all border-none outline-none cursor-pointer", bill.serviceMode === 'percent' ? "bg-slate-900 text-indigo-400 font-bold shadow" : "text-slate-500")}
                  >%</button>
                  <button onClick={() => handleServiceModeChange('amount')}
                    className={cn("px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all border-none outline-none cursor-pointer", bill.serviceMode === 'amount' ? "bg-slate-900 text-indigo-400 font-bold shadow" : "text-slate-500")}
                  >Rp</button>
                </div>
              </div>
              {bill.serviceMode === 'percent' ? (
                <div className="space-y-1">
                  <input id="service-charge-input" type="number" value={bill.serviceCharge === null || bill.serviceCharge === undefined ? '' : bill.serviceCharge}
                    onChange={(e) => updateBill({ serviceCharge: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2 bg-slate-950/50 border border-slate-900 focus:border-indigo-500 rounded-lg outline-none px-3 font-bold text-xs text-white" placeholder="5"
                  />
                  <p className="text-[9px] text-slate-500 font-semibold pl-1 font-numeric">≈ Rp {Math.round(receiptSubtotal * ((bill.serviceCharge || 0) / 100)).toLocaleString('id-ID')}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <PriceInput value={bill.serviceCharge || 0} onChange={(val) => updateBill({ serviceCharge: val })} className="h-[36px] text-xs font-bold" />
                  <p className="text-[9px] text-slate-500 font-semibold pl-1 font-numeric">≈ {(receiptSubtotal > 0 ? ((bill.serviceCharge || 0) / receiptSubtotal) * 100 : 0).toFixed(1)}%</p>
                </div>
              )}
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="tax-input" className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Tax / PB1</label>
                <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-900">
                  <button onClick={() => handleTaxModeChange('percent')}
                    className={cn("px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all border-none outline-none cursor-pointer", bill.taxMode === 'percent' ? "bg-slate-900 text-indigo-400 font-bold shadow" : "text-slate-500")}
                  >%</button>
                  <button onClick={() => handleTaxModeChange('amount')}
                    className={cn("px-2.5 py-1 text-[9px] font-bold rounded-lg transition-all border-none outline-none cursor-pointer", bill.taxMode === 'amount' ? "bg-slate-900 text-indigo-400 font-bold shadow" : "text-slate-500")}
                  >Rp</button>
                </div>
              </div>
              {bill.taxMode === 'percent' ? (
                <div className="space-y-1">
                  <input id="tax-input" type="number" value={bill.tax === null || bill.tax === undefined ? '' : bill.tax}
                    onChange={(e) => updateBill({ tax: parseFloat(e.target.value) || 0 })}
                    className="w-full py-2 bg-slate-950/50 border border-slate-900 focus:border-indigo-500 rounded-lg outline-none px-3 font-bold text-xs text-white" placeholder="11"
                  />
                  <p className="text-[9px] text-slate-500 font-semibold pl-1 font-numeric">≈ Rp {Math.round(receiptSubtotal * ((bill.tax || 0) / 100)).toLocaleString('id-ID')}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <PriceInput value={bill.tax || 0} onChange={(val) => updateBill({ tax: val })} className="h-[36px] text-xs font-bold" />
                  <p className="text-[9px] text-slate-500 font-semibold pl-1 font-numeric">≈ {(receiptSubtotal > 0 ? ((bill.tax || 0) / receiptSubtotal) * 100 : 0).toFixed(1)}%</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-1">
            <div className="text-center md:text-left self-stretch md:self-auto font-numeric">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.2em] block mb-1">Grand Total</span>
              <span className="text-2xl font-black text-white flex items-center justify-center md:justify-start gap-1">
                <span className="text-xs text-slate-500 font-semibold">Rp</span>
                {receiptGrandTotal.toLocaleString('id-ID')}
              </span>
            </div>
            <button onClick={() => setStep(3)}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:via-purple-500 hover:to-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/35 transition-all duration-300 flex items-center justify-center gap-2 border-none cursor-pointer outline-none transform active:scale-[0.99] tracking-wider"
            >
              Next: Add People <Icon name="arrow_forward" className="text-xs font-bold" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(Step2Ledger);
