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
    <div className="flex flex-col gap-4">
      {/* Premium Wizard Timeline Stepper */}
      <div className="w-full bg-surface-elevated/80 backdrop-blur-xl border border-white/[0.04] rounded-3xl p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_8px_32px_rgba(0,0,0,0.3)]">
        <div className="flex items-center justify-between relative w-full overflow-x-auto hide-scrollbar py-1">
          {steps.map((s, i) => {
            const { unlocked, reason } = getStepAccess(i, bill, isScanning);
            const isCurrent = currentStep === i + 1;
            const isPast = currentStep > i + 1;

            return (
              <div key={s} className="flex items-center flex-1 last:flex-none min-w-[100px]">
                <button
                  onClick={() => unlocked ? setStep(i + 1) : null}
                  disabled={!unlocked}
                  className={cn(
                    "flex flex-col items-center gap-2 transition-all text-center outline-none relative group border-none bg-transparent cursor-pointer px-1",
                    !unlocked ? "cursor-not-allowed opacity-30" : "hover:opacity-80"
                  )}
                >
                  {/* Circle Node */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2",
                    isCurrent
                      ? "border-brand-primary bg-gradient-to-br from-brand-primary/20 to-indigo-500/10 text-brand-primary shadow-[0_0_16px_var(--brand-primary-glow)]"
                      : isPast
                        ? "border-emerald-500/50 bg-emerald-950/20 text-emerald-400"
                        : "border-white/[0.06] bg-white/[0.02] text-tertiary"
                  )}>
                    {isPast ? (
                      <Icon name="check" className="text-sm font-black" />
                    ) : !unlocked ? (
                      <Icon name="lock" className="text-xs" />
                    ) : (
                      <span className={cn("text-sm", isCurrent && "font-extrabold")}>{i + 1}</span>
                    )}
                  </div>
                  {/* Step Name */}
                  <span className={cn(
                    "text-[10px] font-semibold tracking-wider leading-tight transition-colors duration-300",
                    isCurrent ? "text-primary" : isPast ? "text-emerald-400/70" : "text-tertiary"
                  )}>
                    {s}
                  </span>

                  {/* Tooltip for locked nodes */}
                  {!unlocked && (
                    <span className="absolute -top-10 z-50 hidden group-hover:block bg-surface-base text-primary text-[8px] font-medium px-2.5 py-1.5 rounded-xl border border-white/[0.06] whitespace-nowrap shadow-xl">
                      {reason}
                    </span>
                  )}
                </button>

                {/* Connecting Line */}
                {i < steps.length - 1 && (
                  <div className="flex-1 mx-3 h-[3px] bg-white/[0.04] relative min-w-[16px] rounded-full overflow-hidden">
                    <div className={cn(
                      "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                      isPast ? "w-full bg-gradient-to-r from-emerald-500 to-emerald-400" : "w-0"
                    )} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Title & Action Bar */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-primary tracking-tight flex items-center gap-2">
            <span className="w-1 h-5 bg-brand-primary rounded-full inline-block"></span>
            {stepTitles[currentStep - 1] ?? 'Bill'}
          </h2>
          <p className="text-xs text-secondary mt-0.5 font-medium">
            {stepSubtitles[currentStep - 1] ?? ''}
          </p>
        </div>

        {showActions && (
          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <button
              onClick={onBack}
              disabled={currentStep === 1}
              className={cn(
                "h-10 px-4 rounded-2xl border border-white/[0.06] text-xs font-medium transition-all flex items-center justify-center gap-1.5 outline-none cursor-pointer",
                currentStep === 1
                  ? "opacity-30 cursor-not-allowed text-tertiary"
                  : "bg-transparent text-secondary hover:bg-white/[0.04] hover:text-primary hover:border-white/[0.1]"
              )}
            >
              Back
            </button>
            <button
              onClick={nextDisabled ? undefined : onNext}
              disabled={nextDisabled}
              className={cn(
                "h-10 px-5 rounded-2xl text-xs font-semibold transition-all flex items-center justify-center gap-2 outline-none border-none",
                nextDisabled
                  ? "bg-white/[0.04] text-tertiary cursor-not-allowed"
                  : "bg-gradient-to-r from-brand-primary to-indigo-500 text-white shadow-xl shadow-brand-primary/20 hover:shadow-[0_0_24px_var(--brand-primary-glow)] cursor-pointer"
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
