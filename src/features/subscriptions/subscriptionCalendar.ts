import type { Subscription } from './types';
import { parseLocalDate } from './buildBillingHistoryFromSubscription';

/** Month names — calendar header + spending label */
export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Monday = 0 … Sunday = 6 */
export function getFirstWeekdayMondayZero(year: number, month: number): number {
  return (new Date(year, month, 1).getDay() + 6) % 7;
}

export function atStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Dates in `[year, month]` when this subscription charges, respecting billing rules and start date.
 */
export function getRecurringDatesInMonth(sub: Subscription, year: number, month: number): Date[] {
  const anchor = atStartOfDay(new Date(sub.nextChargeDate));
  if (Number.isNaN(anchor.getTime())) return [];

  const subStartRaw = parseLocalDate(sub.subscriptionStartDate);
  const restrictByStart = !Number.isNaN(subStartRaw.getTime());
  const subStartDay = restrictByStart ? atStartOfDay(subStartRaw) : null;

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const anchorDay = anchor.getDate();
  const dates: Date[] = [];

  if (sub.billingCycle === 'monthly' || sub.billingCycle === 'quarterly' || sub.billingCycle === 'yearly') {
    const intervalMonths =
      sub.billingCycle === 'monthly' ? 1 : sub.billingCycle === 'quarterly' ? 3 : 12;
    const monthDiff = (year - anchor.getFullYear()) * 12 + (month - anchor.getMonth());
    if (monthDiff % intervalMonths !== 0) return dates;
    const day = Math.min(anchorDay, getDaysInMonth(year, month));
    const candidate = new Date(year, month, day);
    if (restrictByStart && subStartDay && atStartOfDay(candidate) < subStartDay) return dates;
    dates.push(candidate);
    return dates;
  }

  const intervalDays =
    sub.billingCycle === 'weekly' ? 7 : Math.max(1, sub.customCycleDays ?? 30);

  const diffToMonthStart = daysBetween(anchor, monthStart);
  const remainder = ((diffToMonthStart % intervalDays) + intervalDays) % intervalDays;
  const firstOffset = remainder === 0 ? 0 : intervalDays - remainder;
  const first = new Date(monthStart);
  first.setDate(monthStart.getDate() + firstOffset);

  for (let current = new Date(first); current <= monthEnd; current.setDate(current.getDate() + intervalDays)) {
    dates.push(new Date(current));
  }

  if (!restrictByStart || !subStartDay) return dates;
  return dates.filter((d) => atStartOfDay(d) >= subStartDay);
}
