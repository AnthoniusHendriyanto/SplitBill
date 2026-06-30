import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import useBillStore from './store/useBillStore';
import useAuthStore from './store/useAuthStore';
import { api } from './lib/api';
import { cn } from './utils/cn';
import './index.css';

import SideNavBar from './components/SideNavBar';
import TopNavBar from './components/TopNavBar';
import StepHeader from './components/StepHeader';
import BottomTabBar from './components/BottomTabBar';
import MobileHeader from './components/MobileHeader';
import HelpCenterModal from './components/HelpCenterModal';
import BillDetailsModal from './components/BillDetailsModal';

import Step1Scan from './components/Step1Scan';
import Step2Ledger from './components/Step2Ledger';
import Step3People from './components/Step3People';
import Step4Shares from './components/Step4Shares';
import Step5Settlement from './components/Step5Settlement';
import Dashboard from './components/Dashboard';
import ActivityFeed from './components/dashboard/ActivityFeed';
import SettingsPage from './components/SettingsPage';

export default function App() {
  const navigate = useNavigate();
  const bill = useBillStore((s) => s.bill);
  const updateBill = useBillStore((s) => s.updateBill);
  const resetBill = useBillStore((s) => s.resetBill);
  const calculateTotals = useBillStore((s) => s.calculateTotals);
  const settings = useBillStore((s) => s.settings);
  const assignments = useBillStore((s) => s.assignments);
  const ui = useBillStore((s) => s.ui);
  const updateUI = useBillStore((s) => s.updateUI);
  const fetchCompletedBills = useBillStore((s) => s.fetchCompletedBills);
  const completedBills = useBillStore((s) => s.completedBills);
  const isLoadingBills = useBillStore((s) => s.isLoadingBills);
  const completeBill = useBillStore((s) => s.completeBill);
  const accessToken = useAuthStore((state) => state.accessToken);
  const isAuthenticated = !!accessToken;
  const step = ui?.step ?? 1;
  const activeTab = ui?.activeTab ?? 'bills';
  const [isValidating, setIsValidating] = useState(true);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const silentRefresh = useAuthStore((s) => s.silentRefresh);

  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const initialRefreshRef = useRef(false);

  useEffect(() => {
    if (initialRefreshRef.current) return;
    initialRefreshRef.current = true;
    silentRefresh().finally(() => setIsValidating(false));
  }, [silentRefresh]);

  const stepRef = useRef(step);
  const setStep = useCallback((newStep) => {
    const next = typeof newStep === 'function' ? newStep(stepRef.current) : newStep;
    if (next === 1 && stepRef.current > 1) resetBill();
    updateUI({ step: next });
  }, [updateUI, resetBill]);

  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  const setActiveTab = useCallback((tab) => updateUI({ activeTab: tab }), [updateUI]);

  const [isScanning, setIsScanning] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [ocrProgress, setOcrProgress] = useState(0);
  const handleSelectBill = useCallback((id) => setSelectedBillId(id), []);
  const handleNewBill = useCallback(() => { updateUI({ activeTab: 'bills', step: 1 }); }, [updateUI]);
  const handleNext = useCallback(async () => {
    if (step === 4) {
      try { await completeBill('draft'); } catch (err) { console.error('Failed to auto-save draft:', err); }
    }
    setStep(s => Math.min(s + 1, 5));
  }, [step, completeBill, setStep]);
  const handleBack = useCallback(() => setStep(s => Math.max(s - 1, 1)), [setStep]);
  const [ocrStageIndex, setOcrStageIndex] = useState(0);
  const uploadedFileRef = useRef(null);

  useEffect(() => { document.documentElement.classList.toggle('dark', settings.darkMode); }, [settings.darkMode]);

  useEffect(() => { if (!isValidating) fetchCompletedBills(); }, [isValidating, isAuthenticated, fetchCompletedBills]);

  useEffect(() => {
    if (!isValidating && !accessToken) {
      navigate('/login', { replace: true });
    }
  }, [isValidating, accessToken, navigate]);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file (PNG, JPG, HEIC, etc.)');
      return;
    }
    uploadedFileRef.current = file;
    setUploadError(null);
    setIsScanning(true);
    setOcrProgress(0);
    setOcrStageIndex(0);

    const startTime = Date.now();
    const EST_MS = 4000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(elapsed / EST_MS, 0.95);
      setOcrProgress(Math.round(pct * 100));
      if (pct < 0.15) setOcrStageIndex(0);
      else if (pct < 0.30) setOcrStageIndex(1);
      else if (pct < 0.50) setOcrStageIndex(2);
      else if (pct < 0.60) setOcrStageIndex(3);
      else if (pct < 0.70) setOcrStageIndex(4);
      else if (pct < 0.80) setOcrStageIndex(5);
      else if (pct < 0.90) setOcrStageIndex(6);
      else if (pct < 0.95) setOcrStageIndex(7);
    }, 100);

    let base64Url = '';
    try {
      base64Url = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    } catch (e) {
      console.error('Failed to read image file', e);
    }
    try {
      const data = await api.processOCR(file);
      clearInterval(interval);
      if (data?.items?.length) {
        const items = data.items.map(item => ({ id: crypto.randomUUID(), name: item.name, price: item.price, qty: item.quantity || 1 }));
        updateBill({
          title: data.title || '',
          merchant: data.title || '',
          imageUrl: base64Url,
          items,
          serviceCharge: data.service_charge || 0,
          serviceMode: 'amount',
          tax: data.tax || 0,
          taxMode: 'amount',
          discount: data.discount || 0,
          date: data.date || new Date().toISOString().slice(0, 10),
          ocrConfidence: data.confidence || 0,
          ocrSubtotal: data.subtotal || 0,
          ocrGrandTotal: data.total || 0,
        });
      } else {
        setUploadError('No items found in receipt. Try a clearer image or enter items manually.');
      }
      setOcrProgress(100);
      setOcrStageIndex(7);
      setTimeout(() => {
        setIsScanning(false);
        setStep(2);
      }, 600);
    } catch (error) {
      clearInterval(interval);
      setOcrProgress(0);
      setOcrStageIndex(0);
      console.error('OCR Failed', error);
      setUploadError(error.message || 'Could not read receipt. Check that the backend is running and try again.');
      setIsScanning(false);
    }
  }, [updateBill, setStep]);

  const reRunOcr = useCallback(() => {
    const file = uploadedFileRef.current;
    if (file) {
      handleUpload(file);
    }
  }, [handleUpload]);

  const computedSubtotal = useMemo(
    () => bill.items.reduce((sum, item) => sum + (item.unitPrice ?? item.price) * (item.qty ?? item.quantity ?? 1), 0),
    [bill.items]
  );

  const receiptSubtotal = useMemo(
    () => bill.ocrSubtotal || computedSubtotal,
    [bill.ocrSubtotal, computedSubtotal]
  );

  const receiptService = useMemo(() =>
    bill.serviceMode === 'percent' ? receiptSubtotal * (bill.serviceCharge / 100) : (bill.serviceCharge || 0),
    [receiptSubtotal, bill.serviceMode, bill.serviceCharge]
  );

  const receiptTax = useMemo(() =>
    bill.taxMode === 'percent' ? receiptSubtotal * (bill.tax / 100) : (bill.tax || 0),
    [receiptSubtotal, bill.taxMode, bill.tax]
  );

  const receiptDiscount = useMemo(() =>
    bill.discountMode === 'percent' ? Math.round(receiptSubtotal * (bill.discount || 0) / 100) : (bill.discount || 0),
    [receiptSubtotal, bill.discount, bill.discountMode]
  );

  const receiptGrandTotal = useMemo(() =>
    receiptSubtotal + receiptService + receiptTax - receiptDiscount,
    [receiptSubtotal, receiptService, receiptTax, receiptDiscount]
  );

  const personTotals = useMemo(() => calculateTotals(), [bill, settings, assignments]);

  const handleServiceModeChange = useCallback((mode) => {
    if (mode === bill.serviceMode) return;
    const currentVal = bill.serviceCharge || 0;
    let newVal;
    if (mode === 'amount') {
      newVal = Math.round(receiptSubtotal * (currentVal / 100));
    } else {
      newVal = receiptSubtotal > 0 ? Number(((currentVal / receiptSubtotal) * 100).toFixed(1)) : 0;
    }
    updateBill({ serviceMode: mode, serviceCharge: newVal });
  }, [bill.serviceMode, bill.serviceCharge, receiptSubtotal, updateBill]);

  const handleTaxModeChange = useCallback((mode) => {
    if (mode === bill.taxMode) return;
    const currentVal = bill.tax || 0;
    let newVal;
    if (mode === 'amount') {
      newVal = Math.round(receiptSubtotal * (currentVal / 100));
    } else {
      newVal = receiptSubtotal > 0 ? Number(((currentVal / receiptSubtotal) * 100).toFixed(1)) : 0;
    }
    updateBill({ taxMode: mode, tax: newVal });
  }, [bill.taxMode, bill.tax, receiptSubtotal, updateBill]);

  if (isValidating) {
    return (
      <div className="min-h-screen bg-surface-base flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-tertiary text-sm font-semibold">Restoring session...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step1Scan key="step1"
          isScanning={isScanning}
          uploadError={uploadError}
          handleUpload={handleUpload}
          reRunOcr={reRunOcr}
          receiptSubtotal={receiptSubtotal}
          receiptService={receiptService}
          receiptTax={receiptTax}
          receiptDiscount={receiptDiscount}
          receiptGrandTotal={receiptGrandTotal}
          setStep={setStep}
          ocrProgress={ocrProgress}
          ocrStageIndex={ocrStageIndex}
        />;
      case 2:
        return <Step2Ledger
          receiptSubtotal={receiptSubtotal}
          receiptService={receiptService}
          receiptTax={receiptTax}
          receiptDiscount={receiptDiscount}
          receiptGrandTotal={receiptGrandTotal}
          handleServiceModeChange={handleServiceModeChange}
          handleTaxModeChange={handleTaxModeChange}
          setStep={setStep}
        />;
      case 3:
        return <Step3People
          receiptGrandTotal={receiptGrandTotal}
          setStep={setStep}
        />;
      case 4:
        return <Step4Shares
          receiptGrandTotal={receiptGrandTotal}
          receiptSubtotal={receiptSubtotal}
          personTotals={personTotals}
          setStep={setStep}
        />;
      case 5:
        return <Step5Settlement
          receiptSubtotal={receiptSubtotal}
          receiptDiscount={receiptDiscount}
          personTotals={personTotals}
          setActiveTab={setActiveTab}
        />;
      default:
        return <div className="text-secondary p-8 text-center">Unknown Step</div>;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard setActiveTab={setActiveTab} setStep={setStep} setSelectedBillId={setSelectedBillId} />;
    }

    if (activeTab === 'settings') {
      return <SettingsPage />;
    }

    if (activeTab === 'history') {
      return (
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-primary tracking-tight flex items-center gap-2">
              <span className="w-1 h-5 bg-brand-primary rounded-full inline-block" />
              History
            </h2>
            <p className="text-xs text-secondary mt-0.5 font-medium">Completed and archived bills</p>
          </div>
          <ActivityFeed
            bills={completedBills}
            isLoading={isLoadingBills}
            error={null}
            onSelectBill={handleSelectBill}
            onNewBill={handleNewBill}
          />
        </div>
      );
    }

    return (
      <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
        <StepHeader
          currentStep={step}
          setStep={setStep}
          bill={bill}
          isScanning={isScanning}
          nextLabel={step === 1 ? "Next: Review Ledger" : step === 2 ? "Next: Add People" : step === 3 ? "Next: Assign Shares" : "Next: Settlement"}
          onNext={handleNext}
          onBack={handleBack}
          showActions={step < 5}
          nextDisabled={
            (step === 1 && isScanning) ||
            (step === 2 && bill.items.length === 0) ||
            (step === 3 && (!bill.title || bill.persons.length === 0 || !bill.payerId || bill.persons.some(p => !(p.name || '').trim()))) ||
            (step === 4 && bill.items.some(item => bill.persons.filter(p => useBillStore.getState().assignments[p.id]?.[item.id]).length === 0))
          }
        />
        <AnimatePresence mode="wait">
          <div key={step}>
            {renderStep()}
          </div>
        </AnimatePresence>
      </div>
    );
  };

  if (!accessToken) {
    return null;
  }

  return (
    <div className="bg-page text-primary antialiased overflow-hidden h-screen flex">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-bold">
        Skip to main content
      </a>
      {isOffline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-center text-[10px] font-bold py-1.5 tracking-wider" aria-live="polite">
          You are offline. Some features may be unavailable.
        </div>
      )}
      <div className="hidden md:block">
        <SideNavBar onHelpOpen={() => setIsHelpOpen(true)} />
      </div>
      <main id="main-content" className={cn(
        "flex-1 flex flex-col h-screen overflow-hidden bg-page pb-16 md:pb-0 transition-all duration-300",
        isOffline ? "mt-5" : "",
        ui?.sidebarCollapsed ? "md:ml-[72px] ml-0" : "md:ml-[240px] ml-0"
      )}>
        <div className="hidden md:block">
          <TopNavBar />
        </div>
        <div className="md:hidden block">
          <MobileHeader onHelpOpen={() => setIsHelpOpen(true)} />
        </div>
        <div className="mt-14 md:mt-16 flex-1 overflow-hidden flex flex-col">
          {renderContent()}
        </div>
        <div className="md:hidden block">
          <BottomTabBar />
        </div>
      </main>
      <HelpCenterModal open={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      {selectedBillId && (
        <BillDetailsModal billId={selectedBillId} onClose={() => setSelectedBillId(null)} />
      )}
    </div>
  );
}
