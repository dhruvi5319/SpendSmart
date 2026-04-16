import {
  format,
  formatDistanceToNow,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  subDays,
  subMonths,
  isToday,
  isYesterday,
  parseISO,
} from 'date-fns';

export function formatDate(date: string | Date, formatStr: string = 'MMM d, yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';

  return formatDistanceToNow(d, { addSuffix: true });
}

export function getDateRangePresets() {
  const today = new Date();

  return {
    today: {
      label: 'Today',
      start: format(today, 'yyyy-MM-dd'),
      end: format(today, 'yyyy-MM-dd'),
    },
    thisWeek: {
      label: 'This Week',
      start: format(startOfWeek(today), 'yyyy-MM-dd'),
      end: format(endOfWeek(today), 'yyyy-MM-dd'),
    },
    thisMonth: {
      label: 'This Month',
      start: format(startOfMonth(today), 'yyyy-MM-dd'),
      end: format(endOfMonth(today), 'yyyy-MM-dd'),
    },
    last7Days: {
      label: 'Last 7 Days',
      start: format(subDays(today, 6), 'yyyy-MM-dd'),
      end: format(today, 'yyyy-MM-dd'),
    },
    last30Days: {
      label: 'Last 30 Days',
      start: format(subDays(today, 29), 'yyyy-MM-dd'),
      end: format(today, 'yyyy-MM-dd'),
    },
    lastMonth: {
      label: 'Last Month',
      start: format(startOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
      end: format(endOfMonth(subMonths(today, 1)), 'yyyy-MM-dd'),
    },
  };
}

export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}
