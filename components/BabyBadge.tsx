import { BABY_COLORS } from '@/lib/constants';

interface BabyBadgeProps {
  shortName: string;
  name: string;
}

export default function BabyBadge({ shortName, name }: BabyBadgeProps) {
  const colors = BABY_COLORS[shortName as keyof typeof BABY_COLORS];
  if (!colors) return <span className="text-gray-400 text-xs">—</span>;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
      {name}
    </span>
  );
}
