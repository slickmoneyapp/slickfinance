import type { BillingCycle, Subscription, SubscriptionStatus } from './types';

export function isActiveLike(status: SubscriptionStatus) {
  return status === 'active' || status === 'trial';
}

export function toMonthlyEquivalent(price: number, cycle: BillingCycle, customCycleDays?: number) {
  if (!Number.isFinite(price) || price <= 0) return 0;
  switch (cycle) {
    case 'weekly':
      return price * 4.33;
    case 'monthly':
      return price;
    case 'quarterly':
      return price / 3;
    case 'yearly':
      return price / 12;
    case 'custom': {
      const days = customCycleDays && customCycleDays > 0 ? customCycleDays : 30;
      return price * (30 / days);
    }
    default:
      return price;
  }
}

export function subscriptionMonthlyEquivalent(sub: Subscription) {
  return toMonthlyEquivalent(sub.price, sub.billingCycle, sub.customCycleDays);
}

export function monthlySpendTotal(subs: Subscription[]) {
  return subs
    .filter((s) => isActiveLike(s.status))
    .reduce((sum, s) => sum + subscriptionMonthlyEquivalent(s), 0);
}

export function activeSubscriptionsCount(subs: Subscription[]) {
  return subs.filter((s) => isActiveLike(s.status)).length;
}

export function topSubscriptionsByPrice(subs: Subscription[], n: number) {
  return subs
    .filter((s) => isActiveLike(s.status))
    .slice()
    .sort((a, b) => b.price - a.price)
    .slice(0, n);
}

/** Sum billed amounts in a calendar month from `Charged` / `Subscribed` history entries. */
export function sumChargesInCalendarMonth(subs: Subscription[], year: number, month: number): number {
  let sum = 0;
  for (const sub of subs) {
    for (const e of sub.billingHistory) {
      if (e.label !== 'Charged' && e.label !== 'Subscribed') continue;
      const d = new Date(e.date);
      if (Number.isNaN(d.getTime())) continue;
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      sum += e.amount;
    }
  }
  return Math.round(sum * 100) / 100;
}

export type MonthOverMonthPill = {
  tone: 'green' | 'red' | 'neutral' | 'same';
  label: string;
};

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Avoid 4-digit “+3149%” in the pill — cap the displayed number. */
const MOM_PCT_CAP = 999;

function formatUpPct(pctUp: number, prevMon: string): string {
  const n = Math.min(pctUp, MOM_PCT_CAP);
  return `+${n}% vs ${prevMon}`;
}

/**
 * Compares **actual** billed totals (billing history) for this calendar month vs the previous calendar month.
 * Green = spending went down, red = up, neutral = flat / no prior data to compare.
 * Short labels with %, e.g. `+12% vs Mar`, `-30% vs Mar`.
 */
export function getMonthOverMonthSpendPill(subs: Subscription[], now: Date = new Date()): MonthOverMonthPill | null {
  const cy = now.getFullYear();
  const cm = now.getMonth();
  const py = new Date(cy, cm - 1, 1).getFullYear();
  const pm = new Date(cy, cm - 1, 1).getMonth();
  const prevMon = MONTHS_SHORT[pm];

  const curr = sumChargesInCalendarMonth(subs, cy, cm);
  const prevTotal = sumChargesInCalendarMonth(subs, py, pm);

  if (curr === 0 && prevTotal === 0) return null;

  if (prevTotal === 0 && curr > 0) {
    return { tone: 'neutral', label: `New vs ${prevMon}` };
  }

  if (prevTotal > 0 && curr === 0) {
    return { tone: 'green', label: `-100% vs ${prevMon}` };
  }

  const diff = curr - prevTotal;
  const pct = Math.round((Math.abs(diff) / prevTotal) * 100);
  if (pct === 0 || Math.abs(diff) < 0.005) {
    return { tone: 'same', label: `0% vs ${prevMon}` };
  }
  if (diff < 0) {
    return { tone: 'green', label: `-${pct}% vs ${prevMon}` };
  }

  const pctUp = Math.round((diff / prevTotal) * 100);
  return { tone: 'red', label: formatUpPct(pctUp, prevMon) };
}

/** Digits only (commas for thousands), no currency symbol — pair with a separate Currency row. */
export function formatAmountDigits(amount: number) {
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const dollars = Math.floor(abs);
  const cents = Math.round((abs - dollars) * 100);
  const withCommas = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return cents > 0 ? `${sign}${withCommas}.${cents.toString().padStart(2, '0')}` : `${sign}${withCommas}`;
}

export function formatMoney(amount: number, currency: Subscription['currency']) {
  // Simple MVP formatter; can be swapped for Intl later. Always two decimal places (e.g. $0.00).
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const dollars = Math.floor(abs);
  const cents = Math.round((abs - dollars) * 100);
  const withCommas = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = currency === 'EUR' ? '€' : currency === 'GEL' ? '₾' : '$';
  return `${sign}${symbol}${withCommas}.${cents.toString().padStart(2, '0')}`;
}

