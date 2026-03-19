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

export function formatMoney(amount: number, currency: Subscription['currency']) {
  // Simple MVP formatter; can be swapped for Intl later.
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const dollars = Math.floor(abs);
  const cents = Math.round((abs - dollars) * 100);
  const withCommas = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const symbol = currency === 'EUR' ? '€' : currency === 'GEL' ? '₾' : '$';
  return cents > 0 ? `${sign}${symbol}${withCommas}.${cents.toString().padStart(2, '0')}` : `${sign}${symbol}${withCommas}`;
}

