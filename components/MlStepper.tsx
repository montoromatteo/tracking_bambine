'use client';

import { ML_STEP } from '@/lib/constants';

interface MlStepperProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  compact?: boolean;
}

export default function MlStepper({ value, onChange, label = 'ml', compact = false }: MlStepperProps) {
  const btn = compact
    ? 'w-10 h-10 text-xl'
    : 'w-14 h-14 text-2xl';
  const numberBlock = compact ? 'min-w-[70px]' : 'min-w-[100px]';
  const number = compact ? 'text-3xl' : 'text-4xl';
  const gap = compact ? 'gap-2' : 'gap-4';

  return (
    <div className={`flex items-center justify-center ${gap}`}>
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - ML_STEP))}
        className={`${btn} rounded-full bg-gray-200 text-gray-700 font-bold flex items-center justify-center active:bg-gray-300 transition-colors tap-target`}
      >
        −
      </button>
      <div className={`text-center ${numberBlock}`}>
        <div className={`${number} font-bold tabular-nums`}>{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + ML_STEP)}
        className={`${btn} rounded-full bg-blue-500 text-white font-bold flex items-center justify-center active:bg-blue-600 transition-colors tap-target`}
      >
        +
      </button>
    </div>
  );
}
