import { EventType } from './types';

export const BABY_COLORS = {
  AM: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', chart: '#e11d48' },
  AD: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300', chart: '#7c3aed' },
} as const;

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  feeding_bottle: 'Biberon',
  feeding_breast: 'Seno',
  pumping: 'Tirare Latte',
  stool: 'Feci',
  urine: 'Urine',
  weight: 'Peso',
  note: 'Nota',
  brufen: 'Brufen',
  eparina: 'Eparina',
  vitamin_dk: 'Vitamine DK',
  bath: 'Bagnetto',
};

export const EVENT_TYPE_ICONS: Record<EventType, string> = {
  feeding_bottle: '🍼',
  feeding_breast: '🤱',
  pumping: '💧',
  stool: '💩',
  urine: '💦',
  weight: '⚖️',
  note: '📝',
  brufen: '💊',
  eparina: '💉',
  vitamin_dk: '🟡',
  bath: '🛁',
};

export const ML_STEP = 5;
export const ML_DEFAULT = 50;
