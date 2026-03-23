import { useEffect } from 'react';
import {
  requestNotificationPermissions,
  registerPushToken,
} from '../features/notifications/service';
import { useAuthStore } from '../features/auth/store';

/**
 * Call once at the app root.
 * Requests notification permissions and registers the Expo Push Token
 * in Supabase so the server-side Edge Function can send reminders.
 */
export function useNotificationSync() {
  const session = useAuthStore((s) => s.session);

  useEffect(() => {
    if (!session) return;

    requestNotificationPermissions().then((granted) => {
      if (granted) registerPushToken();
    });
  }, [session]);
}
