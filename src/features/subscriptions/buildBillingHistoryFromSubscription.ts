import type { BillingCycle, BillingHistoryEntry, Subscription } from './types';

/** Local calendar date as YYYY-MM-DD (no timezone shift for display). */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseLocalDate(isoDate: string): Date {
  const parts = isoDate.split('-').map(Number);
  const y = parts[0];
  const m = parts[1];
  const d = parts[2];
  if (!y || !m || !d) return new Date(NaN);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function endOfToday(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Add calendar months keeping day-of-month when possible (e.g. Jan 31 → Feb 28). */
export function addMonthsSafe(d: Date, months: number): Date {
  const day = d.getDate();
  const next = new Date(d.getTime());
  next.setMonth(next.getMonth() + months);
  const dim = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(day, dim));
  return next;
}

/** Today’s calendar date at local noon (matches `parseLocalDate` / date pickers). */
export function defaultSubscriptionStartDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
}

/**
 * First payment after subscription start, aligned with `billingCycle` / `customCycleDays`
 * (same stepping as billing-history projection).
 */
export function defaultNextChargeAfterStart(
  subscriptionStart: Date,
  cycle: BillingCycle,
  customCycleDays: number
): Date {
  const start = new Date(subscriptionStart.getTime());
  switch (cycle) {
    case 'weekly':
      return new Date(start.getTime() + 7 * 86400000);
    case 'monthly':
      return addMonthsSafe(start, 1);
    case 'quarterly':
      return addMonthsSafe(start, 3);
    case 'yearly':
      return addMonthsSafe(start, 12);
    case 'custom': {
      const n = Math.max(1, customCycleDays);
      return new Date(start.getTime() + n * 86400000);
    }
    default:
      return addMonthsSafe(start, 1);
  }
}

/**
 * Enumerate charge dates from `subscriptionStartDate` through end of today,
 * following `billingCycle` and `price` (same amount each charge).
 * First charge uses label `Subscribed`, later ones `Charged` (matches MoM calc).
 */
export function buildBillingHistoryFromSubscription(
  sub: Pick<
    Subscription,
    | 'id'
    | 'price'
    | 'currency'
    | 'billingCycle'
    | 'customCycleDays'
    | 'subscriptionStartDate'
  >
): BillingHistoryEntry[] {
  const start = parseLocalDate(sub.subscriptionStartDate);
  const until = endOfToday();
  if (Number.isNaN(start.getTime())) return [];

  const dates: Date[] = [];
  let cursor = new Date(start);

  if (cursor > until) {
    return [
      {
        id: `bh_${sub.id}_0`,
        date: start.toISOString(),
        amount: sub.price,
        currency: sub.currency,
        label: 'Subscribed',
      },
    ];
  }

  switch (sub.billingCycle) {
    case 'weekly': {
      let c = new Date(cursor);
      while (c <= until) {
        dates.push(new Date(c));
        c.setDate(c.getDate() + 7);
      }
      break;
    }
    case 'monthly': {
      let c = new Date(cursor);
      while (c <= until) {
        dates.push(new Date(c));
        c = addMonthsSafe(c, 1);
      }
      break;
    }
    case 'quarterly': {
      let c = new Date(cursor);
      while (c <= until) {
        dates.push(new Date(c));
        c = addMonthsSafe(c, 3);
      }
      break;
    }
    case 'yearly': {
      let c = new Date(cursor);
      while (c <= until) {
        dates.push(new Date(c));
        c = addMonthsSafe(c, 12);
      }
      break;
    }
    case 'custom': {
      const n = Math.max(1, sub.customCycleDays ?? 30);
      let c = new Date(cursor);
      while (c <= until) {
        dates.push(new Date(c));
        c = new Date(c.getTime() + n * 86400000);
      }
      break;
    }
    default: {
      let c = new Date(cursor);
      while (c <= until) {
        dates.push(new Date(c));
        c = addMonthsSafe(c, 1);
      }
    }
  }

  return dates.map((d, i) => ({
    id: `bh_${sub.id}_${i}_${d.getTime()}`,
    date: d.toISOString(),
    amount: sub.price,
    currency: sub.currency,
    label: i === 0 ? 'Subscribed' : 'Charged',
  }));
}
