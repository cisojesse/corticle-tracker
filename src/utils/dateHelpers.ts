import { format, isBefore, addDays, isToday, isTomorrow } from 'date-fns';

export function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d, yyyy');
}

export function isOverdue(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return isBefore(date, today);
}

export function isDueSoon(dateStr: string, daysAhead = 3): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cutoff = addDays(today, daysAhead);
  return !isBefore(date, today) && isBefore(date, cutoff);
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function nowISO(): string {
  return new Date().toISOString();
}
