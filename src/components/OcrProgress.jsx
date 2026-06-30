import { memo } from 'react';
import { motion } from 'framer-motion';
import Icon from './Icon';
import { cn } from '../utils/cn';

const STAGES = [
  { id: 'upload', label: 'Uploading Receipt' },
  { id: 'reading', label: 'Reading Image' },
  { id: 'detection', label: 'OCR Text Detection' },
  { id: 'merchant', label: 'Merchant Recognition' },
  { id: 'items', label: 'Line Item Extraction' },
  { id: 'tax', label: 'Tax & Service Fee Detection' },
  { id: 'validation', label: 'Validation' },
  { id: 'complete', label: 'Complete' },
];

const R = 36;
const C = 2 * Math.PI * R;

function OcrProgress({ progress, stageIndex, isScanning }) {
  const done = progress >= 100 && !isScanning;
  const offset = C * (1 - Math.min(progress, 100) / 100);

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative w-28 h-28 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 96 96">
          <defs>
            <linearGradient id="pg" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c5cff" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="5" />
          <motion.circle cx="48" cy="48" r={R} fill="none" stroke="url(#pg)" strokeWidth="5" strokeLinecap="round"
            strokeDasharray={C} animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
          {done && (
            <circle cx="48" cy="48" r={R} fill="none" stroke="rgba(124,92,255,0.25)" strokeWidth="12" strokeLinecap="round"
              strokeDasharray={C} className="animate-pulse" />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          {done ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Icon name="check_circle" className="text-3xl text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
            </motion.div>
          ) : (
            <motion.span key={Math.round(progress)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xl font-bold text-primary font-numeric">{Math.round(progress)}%</motion.span>
          )}
        </div>
      </div>

      <div className="w-full space-y-2">
        {STAGES.map((s, i) => {
          const isDone = i < stageIndex || done;
          const isActive = i === stageIndex && !done;
          return (
            <motion.div key={s.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
              className="flex items-center gap-2.5"
            >
              {isActive ? (
                <Icon name="sync" className="text-[10px] text-brand-primary animate-spin shrink-0" />
              ) : (
                <Icon name={isDone ? 'check_circle' : 'radio_button_unchecked'}
                  className={cn('text-[10px] shrink-0', isDone ? 'text-emerald-400' : 'text-tertiary/30')} />
              )}
              <span className={cn('text-[10px] font-medium transition-colors',
                isDone ? 'text-tertiary' : isActive ? 'text-primary' : 'text-tertiary/30')}>{s.label}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(OcrProgress);
