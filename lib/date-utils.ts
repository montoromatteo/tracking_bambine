import { format, formatDistanceToNow, startOfDay, endOfDay, isToday, isYesterday } from 'date-fns';
import { it } from 'date-fns/locale';

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM HH:mm', { locale: it });
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMMM yyyy', { locale: it });
}

export function formatTime(date: string | Date): string {
  return format(new Date(date), 'HH:mm', { locale: it });
}

export function formatRelative(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: it });
}

export function formatDateShort(date: string | Date): string {
  return format(new Date(date), 'dd/MM', { locale: it });
}

export function formatDayTime(date: string | Date): string {
  const d = new Date(date);
  const time = format(d, 'HH:mm');
  if (isToday(d)) return `oggi alle ${time}`;
  if (isYesterday(d)) return `ieri alle ${time}`;
  return `${format(d, 'dd/MM')} alle ${time}`;
}

export function toLocalISOString(date: Date): string {
  const offset = date.getTimezoneOffset();
  const adjusted = new Date(date.getTime() - offset * 60 * 1000);
  return adjusted.toISOString().slice(0, 16);
}

export function getDayRange(date: Date) {
  return {
    start: startOfDay(date).toISOString(),
    end: endOfDay(date).toISOString(),
  };
}
