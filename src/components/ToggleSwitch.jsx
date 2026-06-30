import { motion } from 'framer-motion';
import { cn } from '../utils/cn';

export default function ToggleSwitch({ isOn, onChange }) {
  return (
    <div role="switch" tabIndex={0} aria-checked={isOn}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(!isOn); } }}
      onClick={() => onChange(!isOn)}
      className={cn("w-12 h-6 rounded-full relative cursor-pointer transition-colors duration-300", isOn ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-700")}
    >
      <motion.div layout animate={{ x: isOn ? 28 : 4 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
    </div>
  );
}
