'use client';

import { BabyEvent } from '@/lib/types';
import { EVENT_TYPE_LABELS, EVENT_TYPE_ICONS } from '@/lib/constants';
import { formatTime, formatDateTime } from '@/lib/date-utils';
import BabyBadge from './BabyBadge';

interface EventCardProps {
  event: BabyEvent;
  onDelete?: (id: string) => void;
  showDate?: boolean;
}

export default function EventCard({ event, onDelete, showDate = false }: EventCardProps) {
  const icon = EVENT_TYPE_ICONS[event.event_type];
  const label = EVENT_TYPE_LABELS[event.event_type];

  const detail = (() => {
    if (event.event_type === 'feeding_bottle' && event.amount_ml) {
      return `${event.amount_ml} ml`;
    }
    if (event.event_type === 'weight' && event.weight_grams) {
      return `${(event.weight_grams / 1000).toFixed(2)} kg`;
    }
    if (event.event_type === 'pumping' && event.amount_ml) {
      return `${event.amount_ml} ml`;
    }
    return null;
  })();

  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-800">{label}</span>
          {event.baby && (
            <BabyBadge shortName={event.baby.short_name} name={event.baby.name} />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{showDate ? formatDateTime(event.occurred_at) : formatTime(event.occurred_at)}</span>
          {detail && <span className="font-semibold text-gray-700">{detail}</span>}
        </div>
        {event.notes && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{event.notes}</p>
        )}
      </div>
      {onDelete && (
        <button
          onClick={() => {
            if (confirm('Eliminare questo evento?')) {
              onDelete(event.id);
            }
          }}
          className="text-gray-300 hover:text-red-500 transition-colors p-2 tap-target"
        >
          ✕
        </button>
      )}
    </div>
  );
}
