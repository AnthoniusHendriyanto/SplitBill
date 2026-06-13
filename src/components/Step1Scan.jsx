import { memo } from 'react';
import { motion } from 'framer-motion';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import AuthOverlay from './AuthOverlay';
import useAuthStore from '../store/useAuthStore';

function Step1Scan({
  isScanning, uploadError, handleUpload, reRunOcr, receiptSubtotal,
  receiptService, receiptTax, receiptGrandTotal, setStep
}) {
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const addItem = useBillStore((s) => s.addItem);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = !!accessToken;
  const { imageUrl, title, serviceMode, serviceCharge, taxMode, tax } = bill;
  const isScanningOrImage = imageUrl || isScanning;

  const stepView = (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="w-full flex flex-col gap-6"
    >
      {!isScanningOrImage ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto w-full py-8">
          <div className="bg-card border border-slate-900 rounded-3xl p-8 flex flex-col items-center justify-between text-center relative overflow-hidden group hover:border-indigo-500/40 transition-all min-h-[380px] shadow-2xl">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-indigo-500/10 transition-all" />
            <div className="w-16 h-16 rounded-full bg-indigo-950/40 border border-indigo-900/60 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(99,102,241,0.2)]">
              <Icon name="document_scanner" className="text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">Scan Receipt with AI OCR</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-[280px] mx-auto">
                Upload an image of your bill receipt. SplitMate will automatically extract merchant, subtotal, taxes, and items with 98.5% confidence.
              </p>
            </div>
            <div className="mt-6 w-full relative">
              <input
                id="scan-upload"
                type="file"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                accept="image/*"
                onChange={(e) => { e.preventDefault(); if (e.target.files && e.target.files[0]) { handleUpload(e.target.files[0]); e.target.value = ''; } }}
                aria-label="Upload receipt image"
              />
              <button type="button" className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 transition-all flex items-center justify-center gap-2 border-none cursor-pointer outline-none">
                <Icon name="cloud_upload" className="text-base" />
                Upload Receipt Image
              </button>
            </div>
          </div>
          <div className="bg-card border border-slate-900 rounded-3xl p-8 flex flex-col items-center justify-between text-center relative overflow-hidden group hover:border-amber-500/40 transition-all min-h-[380px] shadow-2xl">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/10 transition-all" />
            <div className="w-16 h-16 rounded-full bg-amber-950/40 border border-amber-900/60 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Icon name="edit_note" className="text-2xl" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white mb-2">Create Ledger Manually</h3>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed max-w-[280px] mx-auto">
                Key in merchant details, tax charges, and line items manually step-by-step to customize your splitting workspace.
              </p>
            </div>
            <div className="mt-6 w-full">
              <button type="button"
                onClick={() => {
                  updateBill({ title: "Manual Ledger", imageUrl: "", items: [], persons: [] });
                  addItem();
                  setStep(2);
                }}
                className="w-full py-3.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-200 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer outline-none"
              >
                <Icon name="keyboard" className="text-base" />
                Key In Ledger Details
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-8 w-full">
          <div className="col-span-12 lg:col-span-6 bg-card border border-slate-900 rounded-2xl p-6 flex flex-col justify-between overflow-hidden relative min-h-[440px]">
            {isScanning && (
              <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600/10">
                <motion.div
                  initial={{ left: '-100%' }}
                  animate={{ left: '100%' }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                  className="absolute top-0 w-1/2 h-full bg-indigo-500 shadow-[0_0_15px_3px_rgba(79,70,229,0.5)]"
                />
              </div>
            )}
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Receipt Preview
                </span>
                {!isScanning && imageUrl && (
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => { updateBill({ imageUrl: "", title: "", items: [], serviceCharge: 0, tax: 0 }); setStep(1); }}
                      className="text-[9px] font-extrabold uppercase text-rose-400 hover:text-rose-300 transition-colors border-none bg-transparent outline-none cursor-pointer flex items-center gap-1"
                    >
                      <Icon name="delete" className="text-[10px]" />
                      Replace Receipt
                    </button>
                    <button type="button"
                      onClick={reRunOcr}
                      className="text-[9px] font-extrabold uppercase text-indigo-400 hover:text-indigo-300 transition-colors border-none bg-transparent outline-none cursor-pointer flex items-center gap-1"
                    >
                      <Icon name="refresh" className="text-[10px]" />
                      Re-run OCR
                    </button>
                  </div>
                )}
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-950 bg-slate-950 p-4 min-h-[300px] flex items-center justify-center relative">
                {isScanning ? (
                  <div className="flex flex-col items-center justify-center text-center py-12">
                    <div className="relative mb-6">
                      <Icon name="receipt_long" className="text-7xl text-slate-800 animate-pulse" />
                      <motion.div
                        initial={{ top: 0, opacity: 0.8 }}
                        animate={{ top: '100%', opacity: 1 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", repeatType: "reverse" }}
                        className="absolute left-0 w-full h-[6px] bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.9)] z-10 rounded-full"
                      />
                    </div>
                    <h4 className="font-black text-lg text-white mb-2 tracking-tight">AI Scanning Receipt...</h4>
                    <p className="text-slate-500 text-xs font-semibold leading-relaxed">
                      Extracting merchant, subtotal, line items,<br />tax, and service charges.
                    </p>
                  </div>
                ) : imageUrl ? (
                  <img src={imageUrl} alt="Uploaded Receipt" className="max-h-[380px] w-auto object-contain rounded-lg shadow-2xl" />
                ) : (
                  <div className="text-slate-700 font-bold text-sm italic">No receipt file uploaded</div>
                )}
              </div>
            </div>
          </div>
          <div className="col-span-12 lg:col-span-6 bg-card border border-slate-900 rounded-2xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-full inline-block"></span>
                  Extracted Metadata
                </h3>
                {isScanning ? (
                  <span className="text-[10px] font-bold text-slate-500 animate-pulse uppercase tracking-wider">Analyzing...</span>
                ) : (
                  <span className="text-[9px] font-extrabold text-emerald-400 bg-emerald-950/40 border border-emerald-900/30 px-2.5 py-1 rounded-lg uppercase tracking-wider flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.1)]">
                    <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                    AI OCR
                  </span>
                )}
              </div>
              {isScanning ? (
                <div className="space-y-6">
                  <div className="h-10 bg-slate-950/40 border border-slate-900 animate-pulse rounded-xl" />
                  <div className="h-10 bg-slate-950/40 border border-slate-900 animate-pulse rounded-xl" />
                  <div className="h-24 bg-slate-950/40 border border-slate-900 animate-pulse rounded-xl" />
                </div>
              ) : (
                <div className="space-y-5 font-numeric">
                  <div className="relative group">
                    <label htmlFor="step1-merchant" className="absolute -top-2 left-3 px-1 bg-card text-[9px] font-bold text-indigo-400 uppercase tracking-widest z-10">Merchant Name</label>
                    <input
                      id="step1-merchant"
                      value={title}
                      onChange={(e) => updateBill({ title: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-950/40 border border-slate-900 rounded-xl focus:border-indigo-500 outline-none text-sm font-bold text-white transition-all"
                      placeholder="e.g. Le Petit Bistro"
                    />
                  </div>
                  <div className="bg-slate-950/30 border border-slate-900 rounded-xl p-5 space-y-3.5 text-xs font-semibold text-slate-400">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="text-slate-200">Rp {receiptSubtotal.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Charge ({serviceMode === 'percent' ? `${serviceCharge}%` : 'Fixed'})</span>
                      <span className="text-slate-200">Rp {receiptService.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax ({taxMode === 'percent' ? `${tax}%` : 'Fixed'})</span>
                      <span className="text-slate-200">Rp {receiptTax.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="w-full h-px bg-slate-900 my-2" />
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-white uppercase tracking-wider">Total</span>
                      <span className="text-lg text-indigo-400">Rp {receiptGrandTotal.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {!isScanning && (
              <div className="mt-8 pt-6 border-t border-slate-900 flex justify-end">
                <button type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-1.5 border-none outline-none cursor-pointer"
                >
                  Next: Review Ledger
                  <Icon name="arrow_forward" className="text-xs" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {uploadError && (
        <div className="mt-4 flex items-start gap-3 p-4 bg-red-950/20 border border-red-900/30 rounded-xl max-w-lg mx-auto">
          <Icon name="error" className="text-rose-500 text-lg flex-shrink-0 mt-0.5" />
          <p className="text-xs text-rose-400 font-semibold leading-relaxed">{uploadError}</p>
        </div>
      )}
    </motion.div>
  );

  return !isAuthenticated ? <AuthOverlay>{stepView}</AuthOverlay> : stepView;
}

export default memo(Step1Scan);
