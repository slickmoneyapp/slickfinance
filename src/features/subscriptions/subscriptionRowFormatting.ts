import { atStartOfDay } from './subscriptionCalendar';

export function billingSubtitle(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'Next billing soon';
  const charge = atStartOfDay(d);
  const today = atStartOfDay(new Date());
  const diff = Math.round((charge.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Next Billing Today';
  if (diff === 1) return 'Next Billing Tomorrow';
  return `Next billing ${d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })}`;
}

const CYCLE_SHORT: Record<string, string> = {
  weekly: 'wk',
  monthly: 'mo',
  quarterly: 'qtr',
  yearly: 'yr',
};

export function cycleShort(c: string): string {
  return CYCLE_SHORT[c] ?? c;
}
