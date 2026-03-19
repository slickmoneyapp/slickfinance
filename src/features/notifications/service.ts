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

export async function scheduleRenewalReminder(
  sub: Subscription,
  daysBefore: number = 1,
): Promise<string | undefined> {
  if (!sub.reminderEnabled) return undefined;
  if (sub.status !== 'active' && sub.status !== 'trial') return undefined;

  const nextCharge = new Date(sub.nextChargeDate);
  if (Number.isNaN(nextCharge.getTime())) return undefined;

  const triggerDate = new Date(nextCharge);
  triggerDate.setDate(triggerDate.getDate() - daysBefore);
  triggerDate.setHours(9, 0, 0, 0);

  if (triggerDate <= new Date()) return undefined;

  const label =
    daysBefore === 0
      ? 'today'
      : daysBefore === 1
        ? 'tomorrow'
        : `in ${daysBefore} days`;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${sub.serviceName} renews ${label}`,
        body: `${formatMoney(sub.price, sub.currency)} will be charged.`,
        sound: true,
        data: { subscriptionId: sub.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: triggerDate },
    });
    return id;
  } catch {
    return undefined;
  }
}

export async function cancelNotification(notificationId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // silently ignore — notification may have already fired or been removed
  }
}

export async function sendTestNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Budget Planner',
      body: 'Notifications are working!',
      sound: true,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 2000) },
  });
}
