'use client';

import { toLocalISOString } from '@/lib/date-utils';

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export default function DateTimePicker({ value, onChange }: DateTimePickerProps) {
  const setNow = () => {
    onChange(toLocalISOString(new Date()));
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="datetime-local"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-base border-2 border-transparent focus:border-blue-300 focus:outline-none tap-target"
      />
      <button
        type="button"
        onClick={setNow}
        className="px-4 py-3 bg-gray-200 rounded-xl text-sm font-medium text-gray-600 active:bg-gray-300 transition-colors tap-target whitespace-nowrap"
      >
        Adesso
      </button>
    </div>
  );
}
