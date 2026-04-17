'use client';

import { Baby } from '@/lib/types';
import { BABY_COLORS } from '@/lib/constants';

interface BabySelectorProps {
  babies: Baby[];
  selected: string | 'both' | null;
  onChange: (value: string | 'both') => void;
  showBoth?: boolean;
}

export default function BabySelector({ babies, selected, onChange, showBoth = true }: BabySelectorProps) {
  return (
    <div className="flex gap-2">
      {babies.map((baby) => {
        const colors = BABY_COLORS[baby.short_name as keyof typeof BABY_COLORS];
        const isActive = selected === baby.id;
        return (
          <button
            key={baby.id}
            type="button"
            onClick={() => onChange(baby.id)}
            className={`flex-1 py-3 px-4 rounded-xl text-base font-semibold transition-all tap-target ${
              isActive
                ? `${colors.bg} ${colors.text} ${colors.border} border-2 shadow-sm`
                : 'bg-gray-100 text-gray-500 border-2 border-transparent'
            }`}
          >
            <span className="text-xs block opacity-70">{baby.short_name}</span>
            {baby.name}
          </button>
        );
      })}
      {showBoth && (
        <button
          type="button"
          onClick={() => onChange('both')}
          className={`flex-1 py-3 px-4 rounded-xl text-base font-semibold transition-all tap-target ${
            selected === 'both'
              ? 'bg-amber-100 text-amber-700 border-2 border-amber-300 shadow-sm'
              : 'bg-gray-100 text-gray-500 border-2 border-transparent'
          }`}
        >
          <span className="text-xs block opacity-70">👶👶</span>
          Entrambe
        </button>
      )}
    </div>
  );
}
