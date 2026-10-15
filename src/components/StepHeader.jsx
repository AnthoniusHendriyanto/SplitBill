import { memo } from 'react';
import useBillStore from '../store/useBillStore';
import Icon from './Icon';
import { cn } from '../utils/cn';

const steps = ["Scan", "Review", "People", "Split", "Settle"];

const getStepAccess = (idx, bill, isScanning) => {
  switch (idx) {
    case 0: return true;
    case 1: return !isScanning;
    case 2: return bill.items.length > 0;
    case 3: return bill.items.length > 0 && bill.persons.length >= 1 && bill.payerId && bill.title;
    case 4: return bill.items.length > 0 && bill.persons.length >= 1 && bill.items.every(item => bill.persons.some(p => {
      try { return useBillStore.getState().assignments[p.id]?.[item.id]; } catch { return false; }
    }));
    default: return false;
  }
};

function StepHeader({ currentStep, setStep, nextLabel, onNext, onBack, showActions = true, nextDisabled = false, bill, isScanning }) {
  return (
    <div className="flex flex-col gap-7 mb-2">
      {/* Progress bar */}
      <nav aria-label="Bill progress" className="grid grid-cols-5 gap-1 sm:gap-3 border-b border-border pb-5">
        {steps.map((s, i) => {
          const isCurrent = currentStep === i + 1;
          const isPast = currentStep > i + 1;
          const unlocked = getStepAccess(i, bill, isScanning);
          return (
            <button
              key={s}
              onClick={() => unlocked && setStep(i + 1)}
              disabled={!unlocked}
              aria-label={`Step ${i + 1}: ${s}`}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                "min-h-12 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-2 rounded-xl p-2 text-xs sm:text-sm font-semibold transition-colors",
                isCurrent ? "bg-brand-primary text-[--text-inverse]" : "text-secondary",
                !unlocked && "cursor-not-allowed",
                unlocked && !isCurrent && "hover:bg-surface-raised cursor-pointer"
              )}
              title={s}
            ><span className={cn('w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs', isCurrent ? 'bg-[#151714] text-[#d5ed58]' : 'border border-border-strong')}>{isPast ? <Icon name="check" className="text-sm" /> : `0${i + 1}`}</span><span>{s}</span></button>
          );
        })}
      </nav>

      {/* Title + Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="page-title">
            {currentStep === 1 && 'Good times. Fair shares.'}
            {currentStep === 2 && 'Check the little details.'}
            {currentStep === 3 && 'Who’s in?'}
            {currentStep === 4 && 'Make it everyone’s fair share.'}
            {currentStep === 5 && 'All split. All sorted.'}
          </h1>
          <p className="text-sm text-secondary mt-3">{['Start with a receipt. We’ll take it from here.', 'Make sure the items and prices match your receipt.', 'Add your people and choose who covered the bill.', 'Pick a split method that works for your group.', 'Review who pays whom, then save your split.'][currentStep - 1]}</p>
        </div>

        {showActions && (
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {currentStep > 1 && (
              <button onClick={onBack}
                className="h-9 px-3.5 rounded-lg text-xs font-bold text-[--text-secondary] bg-white/[0.04] hover:bg-white/[0.08] border border-[--border] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Icon name="arrow_back" className="text-sm" /> Back
              </button>
            )}
            {onNext && (
              <button onClick={onNext} disabled={nextDisabled}
                className={cn(
                  "h-9 px-4 rounded-lg text-xs font-bold tracking-wide transition-all flex items-center gap-1.5 cursor-pointer border-none",
                  nextDisabled
                    ? "bg-[--surface-raised] text-[--text-tertiary] cursor-not-allowed opacity-50"
                    : "bg-[--brand-primary] text-[--text-inverse] hover:bg-[--brand-primary-hover] active:scale-95 shadow-sm"
                )}
              >
                {nextLabel || 'Continue'}
                <Icon name="arrow_forward" className="text-sm" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(StepHeader);
