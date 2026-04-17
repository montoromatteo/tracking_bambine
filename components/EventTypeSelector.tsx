'use client';

export type EventCategory = 'feeding' | 'pumping' | 'weight' | 'note' | 'brufen' | 'eparina' | 'vitamin_bk';

interface EventTypeSelectorProps {
  selected: EventCategory;
  onChange: (value: EventCategory) => void;
}

const ROW1: { value: EventCategory; label: string; icon: string }[] = [
  { value: 'feeding', label: 'Poppata', icon: '🍼' },
  { value: 'pumping', label: 'Tirare Latte', icon: '💧' },
  { value: 'weight', label: 'Peso', icon: '⚖️' },
  { value: 'note', label: 'Nota', icon: '📝' },
];

const ROW2: { value: EventCategory; label: string; icon: string }[] = [
  { value: 'brufen', label: 'Brufen', icon: '💊' },
  { value: 'eparina', label: 'Eparina', icon: '💉' },
  { value: 'vitamin_bk', label: 'Vit. BK', icon: '🟡' },
];

function OptionButton({
  opt,
  selected,
  onChange,
}: {
  opt: { value: EventCategory; label: string; icon: string };
  selected: EventCategory;
  onChange: (value: EventCategory) => void;
}) {
  const isActive = selected === opt.value;
  return (
    <button
      type="button"
      onClick={() => onChange(opt.value)}
      className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl text-sm font-medium transition-all tap-target ${
        isActive
          ? 'bg-blue-100 text-blue-700 border-2 border-blue-300 shadow-sm'
          : 'bg-gray-100 text-gray-600 border-2 border-transparent'
      }`}
    >
      <span className="text-xl mb-1">{opt.icon}</span>
      <span className="text-xs leading-tight">{opt.label}</span>
    </button>
  );
}

export default function EventTypeSelector({ selected, onChange }: EventTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {ROW1.map((opt) => (
          <OptionButton key={opt.value} opt={opt} selected={selected} onChange={onChange} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {ROW2.map((opt) => (
          <OptionButton key={opt.value} opt={opt} selected={selected} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}
