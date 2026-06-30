import { memo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import AuthOverlay from './AuthOverlay';
import useAuthStore from '../store/useAuthStore';
import OcrProgress from './OcrProgress';

const SCAN_ORDER = ['merchant', 'date', 'items', 'subtotal', 'discount', 'tax', 'service', 'total'];

function ExtractionRow({ label, scanning, ocrStageIndex, minStage, revealed, value, prefix, valueClass }) {
  let status = 'pending';
  let statusText = 'Waiting for analysis';
  if (scanning) {
    if (ocrStageIndex >= minStage) {
      status = 'active';
      statusText = 'Detecting...';
    }
  } else if (revealed) {
    status = 'done';
  }
  return (
    <motion.div
      initial={!scanning ? { opacity: 0, y: 6 } : undefined}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center justify-between py-2.5 border-b border-white/[0.03] last:border-0"
    >
      <span className="text-[10px] font-medium text-secondary">{label}</span>
      {status === 'done' && value !== undefined ? (
        <span className={`text-xs font-semibold font-numeric ${valueClass || 'text-primary'}`}>{prefix}{value}</span>
      ) : (
        <span className={status === 'active' ? 'text-[10px] text-brand-primary font-medium flex items-center gap-1' : 'text-[9px] text-tertiary/50'}>
          {status === 'active' && <Icon name="sync" className="text-[8px] animate-spin" />}
          {statusText}
        </span>
      )}
    </motion.div>
  );
}

function Step1Scan({
  isScanning, uploadError, handleUpload, reRunOcr, receiptSubtotal,
  receiptService, receiptTax, receiptDiscount, receiptGrandTotal, setStep,
  ocrProgress, ocrStageIndex,
}) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const addItem = useBillStore((s) => s.addItem);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = !!accessToken;
  const { imageUrl, title, serviceMode, serviceCharge, taxMode, tax } = bill;
  const isScanningOrImage = imageUrl || isScanning;

  const [revealed, setRevealed] = useState({});
  const prevScanning = useRef(isScanning);

  useEffect(() => {
    if (prevScanning.current && !isScanning && !uploadError && imageUrl) {
      setRevealed({});
      const timers = SCAN_ORDER.map((f, i) =>
        setTimeout(() => setRevealed(prev => ({ ...prev, [f]: true })), (i + 1) * 180)
      );
      return () => timers.forEach(clearTimeout);
    }
    prevScanning.current = isScanning;
  }, [isScanning, uploadError, imageUrl]);

  const scanStatus = (minStage) => {
    if (!isScanning) return 'done';
    if (ocrStageIndex < minStage) return 'pending';
    return 'active';
  };

  const stepView = (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full flex flex-col gap-6"
    >
      {!isScanningOrImage ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
          {/* AI OCR Card */}
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-br from-brand-primary/20 to-indigo-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="relative bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-8 flex flex-col items-center text-center min-h-[420px] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_0_0_1px_rgba(124,92,255,0.2),0_8px_40px_rgba(0,0,0,0.4)] transition-all duration-300">
              <div className="absolute top-4 right-4 px-2.5 py-1 bg-gradient-to-r from-brand-primary to-indigo-500 rounded-full text-[9px] font-bold text-white tracking-wider shadow-lg shadow-brand-primary/30 z-10">
                RECOMMENDED
              </div>
              <div className="absolute -right-12 -top-12 w-40 h-40 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 border border-brand-primary/20 text-brand-primary flex items-center justify-center mb-5 group-hover:scale-105 group-hover:shadow-glow transition-all duration-300">
                <Icon name="document_scanner" className="text-2xl" />
              </div>
              <h3 className="text-xl font-bold text-primary mb-2">Scan Receipt with AI</h3>
              <p className="text-xs text-secondary leading-relaxed max-w-[260px] mx-auto">
                Upload a photo of your bill. SplitMate automatically extracts items, prices, taxes, and totals with AI.
              </p>
              <div className="relative mt-auto pt-6 w-full">
                <input id="scan-upload" type="file"
                  className="absolute inset-0 w-full h-12 opacity-0 cursor-pointer z-10"
                  accept="image/*"
                  onChange={(e) => { e.preventDefault(); if (e.target.files && e.target.files[0]) { handleUpload(e.target.files[0]); e.target.value = ''; } }}
                  aria-label="Upload receipt image"
                />
                <button type="button" className="w-full h-12 bg-gradient-to-r from-brand-primary to-indigo-500 rounded-2xl text-sm font-semibold text-white shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all duration-200 flex items-center justify-center gap-2 border-none cursor-pointer outline-none relative">
                  <Icon name="cloud_upload" className="text-base" />
                  Upload Receipt Image
                </button>
              </div>
            </div>
          </div>

          {/* Manual Entry Card */}
          <div className="relative group">
            <div className="bg-surface-elevated/60 backdrop-blur-sm border border-white/[0.04] rounded-3xl p-8 flex flex-col items-center text-center min-h-[420px] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_8px_40px_rgba(0,0,0,0.4)] transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-tertiary flex items-center justify-center mb-5 group-hover:scale-105 transition-transform duration-300">
                <Icon name="edit_note" className="text-2xl" />
              </div>
              <h3 className="text-lg font-semibold text-primary mb-2">Enter Manually</h3>
              <p className="text-xs text-secondary leading-relaxed max-w-[260px] mx-auto">
                Key in merchant details, line items, taxes, and service charges by hand.
              </p>
              <div className="mt-auto pt-6 w-full">
                <button type="button"
                  onClick={() => { updateBill({ title: "Manual Ledger", imageUrl: "", items: [], persons: [] }); addItem(); setStep(2); }}
                  className="w-full h-12 bg-transparent hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.1] rounded-2xl text-sm font-medium text-secondary hover:text-primary transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer outline-none"
                >
                  <Icon name="keyboard" className="text-base" />
                  Create Manual Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className={isScanning ? 'flex flex-col items-center' : 'grid grid-cols-12 gap-8 w-full'}>
          {isScanning ? (
            <div className="w-full max-w-md">
              <div className="bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-8 flex flex-col items-center min-h-[440px] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
                {/* Progress ring + stages */}
                <OcrProgress progress={ocrProgress} stageIndex={ocrStageIndex} isScanning={true} />

                {/* Extraction status */}
                <div className="w-full mt-6 pt-5 border-t border-white/[0.04] space-y-1">
                  <ExtractionRow label="Merchant" scanning={true} ocrStageIndex={ocrStageIndex} minStage={3} />
                  <ExtractionRow label="Date" scanning={true} ocrStageIndex={ocrStageIndex} minStage={3} />
                  <ExtractionRow label="Items" scanning={true} ocrStageIndex={ocrStageIndex} minStage={4} />
                  <ExtractionRow label="Tax" scanning={true} ocrStageIndex={ocrStageIndex} minStage={5} />
                  <ExtractionRow label="Service Fee" scanning={true} ocrStageIndex={ocrStageIndex} minStage={5} />
                  <ExtractionRow label="Subtotal" scanning={true} ocrStageIndex={ocrStageIndex} minStage={6} />
                  <ExtractionRow label="Discount" scanning={true} ocrStageIndex={ocrStageIndex} minStage={7} />
                  <ExtractionRow label="Grand Total" scanning={true} ocrStageIndex={ocrStageIndex} minStage={7} />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Receipt preview panel */}
              <div className="col-span-12 lg:col-span-6 bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 flex flex-col justify-between overflow-hidden relative min-h-[440px] shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-primary"></span>
                      Receipt Preview
                    </span>
                    {!isScanning && imageUrl && (
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => { updateBill({ imageUrl: "", title: "", items: [], serviceCharge: 0, serviceMode: 'percent', tax: 11, taxMode: 'percent', discount: 0, ocrConfidence: 0, ocrSubtotal: 0, ocrGrandTotal: 0, date: new Date().toISOString().slice(0, 10) }); setStep(1); }}
                          className="text-[9px] font-extrabold uppercase text-red-400 hover:text-red-300 transition-colors border-none bg-transparent outline-none cursor-pointer flex items-center gap-1"
                        >
                          <Icon name="delete" className="text-[10px]" />
                          Replace Receipt
                        </button>
                        <button type="button"
                          onClick={reRunOcr}
                          className="text-[9px] font-extrabold uppercase text-brand-primary hover:text-brand-primary-hover transition-colors border-none bg-transparent outline-none cursor-pointer flex items-center gap-1"
                        >
                          <Icon name="refresh" className="text-[10px]" />
                          Re-run OCR
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="rounded-2xl overflow-hidden border border-white/[0.04] bg-black/20 p-4 min-h-[300px] flex items-center justify-center relative">
                    {imageUrl ? (
                      <img src={imageUrl} alt="Uploaded Receipt" className="max-h-[380px] w-auto object-contain rounded-xl shadow-2xl" />
                    ) : (
                      <div className="text-tertiary font-medium text-sm">No receipt file uploaded</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Extracted details panel */}
              <div className="col-span-12 lg:col-span-6 bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 flex flex-col justify-between shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm text-primary tracking-wide flex items-center gap-2">
                      <span className="w-1 h-4 bg-brand-primary rounded-full inline-block"></span>
                      Extracted Details
                    </h3>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-900/30 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                      <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                      AI OCR
                    </span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <ExtractionRow label="Merchant" scanning={false} revealed={revealed.merchant} value={title || '—'} />
                    <ExtractionRow label="Date" scanning={false} revealed={revealed.date} value={new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })} />
                    <ExtractionRow label="Items" scanning={false} revealed={revealed.items} value={`${bill.items.length} items`} />
                    <ExtractionRow label="Subtotal" scanning={false} revealed={revealed.subtotal} value={receiptSubtotal.toLocaleString('id-ID')} prefix="Rp " />
                    {receiptDiscount > 0 && (
                      <ExtractionRow label="Discount" scanning={false} revealed={revealed.discount} value={receiptDiscount.toLocaleString('id-ID')} prefix="-Rp " valueClass="text-amber-400" />
                    )}
                    <ExtractionRow label="Tax" scanning={false} revealed={revealed.tax} value={receiptTax.toLocaleString('id-ID')} prefix="Rp " />
                    <ExtractionRow label="Service Fee" scanning={false} revealed={revealed.service} value={receiptService.toLocaleString('id-ID')} prefix="Rp " />
                    <ExtractionRow label="Grand Total" scanning={false} revealed={revealed.total} value={receiptGrandTotal.toLocaleString('id-ID')} prefix="Rp " />
                  </div>
                </div>
                {!isScanning && (
                  <div className="mt-6 pt-5 border-t border-white/[0.04] flex justify-end">
                    <button type="button"
                      onClick={() => setStep(2)}
                      className="h-11 px-5 bg-gradient-to-r from-brand-primary to-indigo-500 rounded-2xl text-xs font-semibold text-white shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] transition-all duration-200 flex items-center gap-1.5 border-none outline-none cursor-pointer"
                    >
                      Next: Review Ledger
                      <Icon name="arrow_forward" className="text-xs" />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
      {uploadError && (
        <div className="flex items-start gap-3 p-4 bg-red-900/15 backdrop-blur-sm border border-red-500/20 rounded-2xl shadow-xl max-w-lg mx-auto">
          <Icon name="error" className="text-red-500 text-lg flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400 font-medium leading-relaxed">{uploadError}</p>
        </div>
      )}
    </motion.div>
  );

  return !isAuthenticated ? <AuthOverlay>{stepView}</AuthOverlay> : stepView;
}

export default memo(Step1Scan);
