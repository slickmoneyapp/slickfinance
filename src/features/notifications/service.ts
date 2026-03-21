import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Subscription } from '../subscriptions/types';
import { formatMoney } from '../subscriptions/calc';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('renewal-reminders', {
      name: 'Renewal Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return true;
  if (!canAskAgain) return false;
  const { status: newStatus } = await Notifications.requestPermissionsAsync();
  return newStatus === 'granted';
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function addMonthsSafe(base: Date, months: number, anchorDay: number) {
  const next = new Date(base.getFullYear(), base.getMonth() + months, 1);
  next.setDate(Math.min(anchorDay, daysInMonth(next.getFullYear(), next.getMonth())));
  return startOfDay(next);
}

function getNextOccurrenceOnOrAfter(sub: Subscription, fromDate: Date) {
  const anchor = startOfDay(new Date(sub.nextChargeDate));
  const from = startOfDay(fromDate);
  if (Number.isNaN(anchor.getTime())) return undefined;

  if (sub.billingCycle === 'monthly' || sub.billingCycle === 'quarterly' || sub.billingCycle === 'yearly') {
    const intervalMonths =
      sub.billingCycle === 'monthly' ? 1 : sub.billingCycle === 'quarterly' ? 3 : 12;
    const monthDiff = (from.getFullYear() - anchor.getFullYear()) * 12 + (from.getMonth() - anchor.getMonth());
    const steps = monthDiff <= 0 ? 0 : Math.floor(monthDiff / intervalMonths);
    let candidate = addMonthsSafe(anchor, steps * intervalMonths, anchor.getDate());
    while (candidate < from) {
      candidate = addMonthsSafe(candidate, intervalMonths, anchor.getDate());
    }
    return candidate;
  }

  const intervalDays = sub.billingCycle === 'weekly' ? 7 : Math.max(1, sub.customCycleDays ?? 30);
  const diffDays = daysBetween(anchor, from);
  const steps = diffDays <= 0 ? 0 : Math.floor(diffDays / intervalDays);
  const candidate = startOfDay(new Date(anchor.getTime() + steps * intervalDays * 24 * 60 * 60 * 1000));
  while (candidate < from) {
    candidate.setDate(candidate.getDate() + intervalDays);
  }
  return candidate;
}

function getUpcomingOccurrences(sub: Subscription, count: number) {
  const first = getNextOccurrenceOnOrAfter(sub, new Date());
  if (!first) return [] as Date[];
  const occurrences: Date[] = [];
  let current = first;

  for (let i = 0; i < count; i += 1) {
    occurrences.push(new Date(current));
    if (sub.billingCycle === 'monthly') current = addMonthsSafe(current, 1, new Date(sub.nextChargeDate).getDate());
    else if (sub.billingCycle === 'quarterly') current = addMonthsSafe(current, 3, new Date(sub.nextChargeDate).getDate());
    else if (sub.billingCycle === 'yearly') current = addMonthsSafe(current, 12, new Date(sub.nextChargeDate).getDate());
    else {
      const intervalDays = sub.billingCycle === 'weekly' ? 7 : Math.max(1, sub.customCycleDays ?? 30);
      current = new Date(current);
      current.setDate(current.getDate() + intervalDays);
      current = startOfDay(current);
    }
  }

  return occurrences;
}

function reminderPhrase(daysBefore: number) {
  if (daysBefore <= 0) return 'today';
  if (daysBefore === 1) return 'tomorrow';
  if (daysBefore === 7) return 'in 1 week';
  return `in ${daysBefore} days`;
}

function buildTriggerDate(occurrence: Date, daysBefore: number, reminderTime: string) {
  const [hour, minute] = reminderTime.split(':').map((n) => Number(n));
  const trigger = new Date(occurrence);
  trigger.setDate(trigger.getDate() - daysBefore);
  trigger.setHours(Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0);
  return trigger;
}

export async function scheduleRenewalReminders(sub: Subscription): Promise<string[]> {
  if (!sub.reminderEnabled) return [];
  if (sub.status !== 'active' && sub.status !== 'trial') return [];
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return [];

  const ids: string[] = [];
  const occurrences = getUpcomingOccurrences(sub, 12);

  for (const occurrence of occurrences) {
    const triggerDate = buildTriggerDate(occurrence, sub.reminderDaysBefore, sub.reminderTime ?? '09:00');
    if (triggerDate <= new Date()) continue;
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Upcoming charge',
          body: `${sub.serviceName} will charge ${formatMoney(sub.price, sub.currency)} ${reminderPhrase(sub.reminderDaysBefore)}.`,
          sound: true,
          data: { subscriptionId: sub.id, occurrenceDate: occurrence.toISOString() },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
      });
      ids.push(id);
    } catch {
      // ignore single-schedule failure and keep going
    }
  }

  return ids;
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // silently ignore — notification may have already fired or been removed
  }
}

export async function cancelNotifications(notificationIds?: string[]): Promise<void> {
  if (!notificationIds?.length) return;
  await Promise.all(notificationIds.map((id) => cancelNotification(id)));
}

export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Slick finance',
      body: 'Notifications are working!',
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 2000) },
  });
}
