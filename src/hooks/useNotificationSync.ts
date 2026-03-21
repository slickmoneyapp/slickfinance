import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  requestNotificationPermissions,
  scheduleRenewalReminders,
  cancelNotifications,
} from '../features/notifications/service';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import type { Subscription } from '../features/subscriptions/types';

/**
 * Call once at the app root.
 * - Requests permissions.
 * - Full resync after hydration and on app foreground.
 * - Uses Zustand's subscribe (not React hooks) to detect add/remove/update
 *   so we never trigger a React re-render loop.
 */
export function useNotificationSync() {
  const hydrated = useSubscriptionsStore((s) => s.hydrated);
  const didFullSync = useRef(false);

  // Request permissions once
  useEffect(() => {
    requestNotificationPermissions();
  }, []);

  // Full resync once the store is hydrated
  useEffect(() => {
    if (!hydrated || didFullSync.current) return;
    didFullSync.current = true;
    fullResync();
  }, [hydrated]);

  // Re-sync on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && didFullSync.current) {
        fullResync();
      }
    });
    return () => sub.remove();
  }, []);

  // Watch store for incremental changes (add / remove / update) via Zustand subscribe
  useEffect(() => {
    if (!hydrated) return;

    let prevItems: Subscription[] = useSubscriptionsStore.getState().items;

    const unsub = useSubscriptionsStore.subscribe((state) => {
      const nextItems = state.items;
      if (nextItems === prevItems) return;

      const prevMap = new Map(prevItems.map((s) => [s.id, s]));
      const nextMap = new Map(nextItems.map((s) => [s.id, s]));

      // Removed items — cancel their notifications
      for (const prev of prevItems) {
        if (!nextMap.has(prev.id) && prev.notificationIds?.length) {
          cancelNotifications(prev.notificationIds);
        }
      }

      // Added or updated items
      for (const next of nextItems) {
        const prev = prevMap.get(next.id);
        if (!prev) {
          // Newly added
          scheduleRenewalReminders(next).then((ids) => {
            useSubscriptionsStore.getState().update(next.id, { notificationIds: ids });
          });
        } else if (
          prev.nextChargeDate !== next.nextChargeDate ||
          prev.reminderEnabled !== next.reminderEnabled ||
          prev.status !== next.status ||
          prev.reminderDaysBefore !== next.reminderDaysBefore ||
          prev.reminderTime !== next.reminderTime ||
          prev.billingCycle !== next.billingCycle ||
          prev.customCycleDays !== next.customCycleDays ||
          prev.serviceName !== next.serviceName
        ) {
          // Key fields changed — reschedule
          if (next.notificationIds?.length) cancelNotifications(next.notificationIds);
          scheduleRenewalReminders(next).then((ids) => {
            if (JSON.stringify(ids) !== JSON.stringify(next.notificationIds ?? [])) {
              useSubscriptionsStore.getState().update(next.id, { notificationIds: ids });
            }
          });
        }
      }

      prevItems = nextItems;
    });

    return unsub;
  }, [hydrated]);
}

async function fullResync() {
  const { items, update } = useSubscriptionsStore.getState();
  for (const sub of items) {
    if (sub.notificationIds?.length) await cancelNotifications(sub.notificationIds);
    const ids = await scheduleRenewalReminders(sub);
    if (JSON.stringify(ids) !== JSON.stringify(sub.notificationIds ?? [])) {
      update(sub.id, { notificationIds: ids });
    }
  }
}
