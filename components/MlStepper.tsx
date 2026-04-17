'use client';

import { ML_STEP } from '@/lib/constants';

interface MlStepperProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
}

export default function MlStepper({ value, onChange, label = 'ml' }: MlStepperProps) {
  return (
    <div className="flex items-center justify-center gap-4">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - ML_STEP))}
        className="w-14 h-14 rounded-full bg-gray-200 text-gray-700 text-2xl font-bold flex items-center justify-center active:bg-gray-300 transition-colors tap-target"
      >
        −
      </button>
      <div className="text-center min-w-[100px]">
        <div className="text-4xl font-bold tabular-nums">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + ML_STEP)}
        className="w-14 h-14 rounded-full bg-blue-500 text-white text-2xl font-bold flex items-center justify-center active:bg-blue-600 transition-colors tap-target"
      >
        +
      </button>
    </div>
  );
}
