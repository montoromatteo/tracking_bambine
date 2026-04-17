'use client';

interface BooleanToggleProps {
  label: string;
  icon: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export default function BooleanToggle({ label, icon, value, onChange }: BooleanToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`flex items-center gap-3 w-full py-3 px-4 rounded-xl text-base font-medium transition-all tap-target ${
        value
          ? 'bg-green-100 text-green-700 border-2 border-green-300'
          : 'bg-gray-100 text-gray-500 border-2 border-transparent'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
      <span className="ml-auto text-sm font-semibold">
        {value ? 'Si' : 'No'}
      </span>
    </button>
  );
}
