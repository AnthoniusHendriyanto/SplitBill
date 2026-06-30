import { memo } from 'react';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const steps = ["SCAN RECEIPT", "REVIEW LEDGER", "ADD PEOPLE", "ASSIGN SHARES", "SETTLEMENT"];

const getStepAccess = (idx, bill, isScanning) => {
  switch (idx) {
    case 0: return { unlocked: true, reason: '' };
    case 1: return { unlocked: !isScanning, reason: 'Wait for scan to complete or add items manually' };
    case 2: return { unlocked: bill.items.length > 0, reason: 'Add at least 1 item to the ledger first' };
    case 3: return { unlocked: bill.items.length > 0 && bill.persons.length >= 1 && bill.payerId && bill.title, reason: 'Set bill title, add people, and select payer first' };
    case 4: return { unlocked: bill.items.length > 0 && bill.persons.length >= 1 && bill.items.every(item => bill.persons.some(p => {
      try {
        return useBillStore.getState().assignments[p.id]?.[item.id];
      } catch { return false; }
    })), reason: 'Assign all items to people first' };
    default: return { unlocked: false, reason: '' };
  }
};

const stepTitles = [
  'Upload Receipt',
  'Review Bill Ledger',
  'Add People',
  'Assign Item Shares',
  'Settlement Overview',
];

const stepSubtitles = [
  'Scan your receipt with AI OCR, or enter items manually.',
  'Review and correct items extracted from the receipt.',
  'Name the bill, add participants, and select who paid.',
  'Select who participates in each expense.',
  'Review the final individual breakdowns.',
];

function StepHeader({ currentStep, setStep, nextLabel, onNext, onBack, showActions = true, nextDisabled = false, bill, isScanning }) {
  return (
    <div className="flex flex-col gap-6 mb-8">
      {/* Premium Wizard Timeline Stepper */}
      <div className="w-full bg-card border border rounded-2xl p-5 relative overflow-hidden">
        <div className="flex items-center justify-between relative z-10 w-full overflow-x-auto hide-scrollbar py-2">
          {steps.map((s, i) => {
            const { unlocked, reason } = getStepAccess(i, bill, isScanning);
            const isCurrent = currentStep === i + 1;
            const isPast = currentStep > i + 1;

            return (
              <div key={s} className="flex items-center flex-1 last:flex-none min-w-[120px]">
                <button
                  onClick={() => unlocked ? setStep(i + 1) : null}
                  disabled={!unlocked}
                  className={cn(
                    "flex flex-col items-start gap-1.5 transition-all text-left outline-none relative group border-none bg-transparent cursor-pointer",
                    isCurrent ? "scale-105" : "",
                    !unlocked ? "cursor-not-allowed opacity-40" : "hover:opacity-90"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {/* Circle Node */}
                    <div className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all border",
                      isCurrent 
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                        : isPast 
                          ? "bg-indigo-950/40 border-indigo-900/60 text-indigo-400" 
                          : "bg-surface-base/40 border text-tertiary"
                    )}>
                      {isPast ? (
                        <Icon name="check" className="text-xs font-black" />
                      ) : !unlocked ? (
                        <Icon name="lock" className="text-[10px]" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {/* Step Name */}
                    <span className={cn(
                      "text-[9px] font-bold uppercase tracking-widest leading-none",
                      isCurrent ? "text-white" : isPast ? "text-indigo-400" : "text-tertiary"
                    )}>
                      {s}
                    </span>
                  </div>
                  
                  {/* Tooltip for locked nodes */}
                  {!unlocked && (
                    <span className="absolute left-0 -top-8 z-50 hidden group-hover:block bg-surface-base text-primary text-[8px] font-bold px-2 py-1 rounded border border-strong whitespace-nowrap shadow-xl">
                      Locked: {reason}
                    </span>
                  )}
                </button>
                
                {/* Connecting Line */}
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-4 h-[2px] bg-surface-elevated relative min-w-[20px]">
                    <div className={cn(
                      "absolute left-0 top-0 h-full transition-all duration-300",
                      isPast ? "w-full bg-indigo-500" : "w-0 bg-transparent"
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-6 bg-indigo-500 rounded-full inline-block"></span>
            {stepTitles[currentStep - 1] ?? 'Bill'}
          </h2>
          <p className="text-tertiary mt-1.5 text-xs md:text-sm font-medium">
            {stepSubtitles[currentStep - 1] ?? ''}
          </p>
        </div>

        {showActions && (
          <div className="flex items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
            <button
              onClick={onBack}
              disabled={currentStep === 1}
              className={cn(
                "px-5 py-2.5 rounded-xl border border font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer",
                currentStep === 1 
                  ? "opacity-35 cursor-not-allowed text-tertiary" 
                  : "bg-surface-base/40 text-primary hover:bg-surface-elevated hover:border-strong"
              )}
            >
              Back
            </button>
            <button
              onClick={nextDisabled ? undefined : onNext}
              disabled={nextDisabled}
              className={cn(
                "px-6 py-2.5 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 outline-none border-none",
                nextDisabled 
                  ? "bg-surface-elevated text-tertiary cursor-not-allowed shadow-none" 
                  : "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 cursor-pointer"
              )}
            >
              {nextLabel}
              <Icon name="arrow_forward" className="text-xs" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StepHeader);
