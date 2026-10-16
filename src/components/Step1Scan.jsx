import { memo } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import AuthOverlay from './AuthOverlay';
import useAuthStore from '../store/useAuthStore';
import OcrProgress from './OcrProgress';

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
      <span className="text-[11px] font-medium text-secondary">{label}</span>
      {status === 'done' && value !== undefined ? (
        <span className={`text-xs font-semibold font-numeric ${valueClass || 'text-primary'}`}>{prefix}{value}</span>
      ) : (
        <span className={status === 'active' ? 'text-[11px] text-[--brand-primary] font-medium flex items-center gap-1' : 'text-[10px] text-tertiary/50'}>
          {status === 'active' && <Icon name="sync" className="text-[10px] animate-spin" />}
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
  const resetBill = useBillStore((s) => s.resetBill);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = !!accessToken;
  const { imageUrl, title } = bill;
  const isScanningOrImage = imageUrl || isScanning;

  const revealed = !isScanning && !!imageUrl;

  const stepView = (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full flex flex-col gap-6"
    >
      {!isScanningOrImage ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 w-full">
          <section className="panel p-5 sm:p-8">
            <div className="flex justify-between items-center mb-6"><h2 className="text-lg font-bold">Start with a snap</h2><span className="text-xs font-semibold text-secondary border border-border rounded-full px-3 py-1">Receipt scan</span></div>
            <label htmlFor="scan-upload" className="relative min-h-[270px] sm:min-h-[330px] rounded-xl border-2 border-dashed border-border-strong bg-surface-base flex flex-col items-center justify-center text-center p-6 cursor-pointer group focus-within:outline focus-within:outline-2 focus-within:outline-offset-4 focus-within:outline-[--border-focus] hover:border-[--brand-ink] transition-colors">
              <span className="w-20 h-24 bg-brand-primary rounded-xl text-[#151714] flex items-center justify-center -rotate-6 group-hover:rotate-0 transition-transform mb-7"><Icon name="receipt_long" className="text-5xl" /></span>
              <span className="text-2xl font-extrabold tracking-tight">The bill goes here.</span>
              <span className="text-sm text-secondary mt-2 mb-6 max-w-xs">Choose a clear receipt photo. We’ll read the items and prices for you.</span>
              <span className="btn-primary"><Icon name="add_photo_alternate" className="text-xl" />Upload Receipt</span>
              <input id="scan-upload" type="file" className="sr-only" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (file) handleUpload(file); e.target.value = ''; }} />
            </label>
            <p className="text-xs text-secondary mt-4 flex items-center gap-2"><Icon name="crop_free" className="text-base" />Keep the whole receipt in frame, with good lighting.</p>
          </section>
          <aside className="flex flex-col gap-5">
            <div className="bg-brand-primary rounded-2xl p-6 sm:p-8 text-[#151714] flex-1">
              <Icon name="call_split" className="text-4xl mb-5" />
              <h2 className="text-3xl font-extrabold leading-tight tracking-tighter">You had the fries.<br />They had the latte.</h2>
              <p className="text-sm mt-4 leading-relaxed max-w-xs">Split equally or pick who had what. Everyone gets their fair share.</p>
            </div>
            <div className="receipt-panel p-6">
              <div className="flex gap-3 items-center mb-3"><Icon name="edit_note" className="text-2xl" /><h2 className="text-lg font-bold">No receipt? No problem.</h2></div>
              <p className="text-sm text-secondary mb-5">Add the items and prices yourself.</p>
              <button type="button" onClick={() => { resetBill(); updateBill({ title: 'Manual Ledger' }); addItem(); setStep(2); }} className="btn-secondary w-full">Enter Manually <Icon name="arrow_forward" className="text-lg" /></button>
            </div>
          </aside>
        </div>
      ) : (
        <div className={isScanning ? 'flex flex-col items-center' : 'grid grid-cols-12 gap-8 w-full'}>
          {isScanning ? (
            <div className="w-full max-w-md">
              <div className="bg-[--surface-elevated] border border-[--border] rounded-2xl p-8 flex flex-col items-center min-h-[440px] shadow-card">
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
              <div className="col-span-12 lg:col-span-6 bg-[--surface-elevated] border border-[--border] rounded-2xl p-6 flex flex-col justify-between overflow-hidden relative min-h-[440px] shadow-card">
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
              <div className="col-span-12 lg:col-span-6 bg-[--surface-elevated] border border-[--border] rounded-2xl p-6 flex flex-col justify-between shadow-card">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm text-primary tracking-wide">
                      Extracted Details
                    </h3>
                    <span className="text-[10px] font-semibold text-[--brand-primary] bg-[--brand-primary-subtle] border border-[--brand-primary]/20 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[--brand-primary]"></span>
                      AI OCR
                    </span>
                  </div>
                  <div className="space-y-2 pt-2">
                    <ExtractionRow label="Merchant" scanning={false} revealed={revealed} value={title || '—'} />
                    <ExtractionRow label="Date" scanning={false} revealed={revealed} value={bill.date || 'Not detected'} />
                    <ExtractionRow label="Items" scanning={false} revealed={revealed} value={`${bill.items.length} items`} />
                    <ExtractionRow label="Subtotal" scanning={false} revealed={revealed} value={receiptSubtotal.toLocaleString('id-ID')} prefix="Rp " />
                    {receiptDiscount > 0 && (
                      <ExtractionRow label="Discount" scanning={false} revealed={revealed} value={receiptDiscount.toLocaleString('id-ID')} prefix="-Rp " valueClass="text-warning" />
                    )}
                    <ExtractionRow label="Tax" scanning={false} revealed={revealed} value={receiptTax.toLocaleString('id-ID')} prefix="Rp " />
                    <ExtractionRow label="Service Fee" scanning={false} revealed={revealed} value={receiptService.toLocaleString('id-ID')} prefix="Rp " />
                    <ExtractionRow label="Grand Total" scanning={false} revealed={revealed} value={receiptGrandTotal.toLocaleString('id-ID')} prefix="Rp " />
                  </div>
                </div>
                {!isScanning && (
                  <div className="mt-6 pt-5 border-t border-white/[0.04] flex justify-end">
                    <button type="button"
                      onClick={() => setStep(2)}
                      className="h-11 px-5 bg-[--brand-primary] hover:bg-[--brand-primary-hover] active:scale-[0.98] rounded-xl text-xs font-bold text-[--text-inverse] shadow-sm transition-all duration-150 flex items-center gap-1.5 border-none outline-none cursor-pointer"
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
