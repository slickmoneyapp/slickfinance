import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

type SettingsState = {
  preferredCurrency: string;
  defaultReminderTime: string; // "HH:mm"
  notificationsEnabled: boolean;

  hydrated: boolean;
  hydrate: () => Promise<void>;

  setPreferredCurrency: (currency: string) => Promise<void>;
  setDefaultReminderTime: (hhmm: string) => Promise<void>;
  setNotificationsEnabled: (enabled: boolean) => Promise<void>;
};

const STORAGE_KEY = 'slickmoney:settings:v1';

type Persisted = Pick<
  SettingsState,
  'preferredCurrency' | 'defaultReminderTime' | 'notificationsEnabled'
>;

const DEFAULTS: Persisted = {
  preferredCurrency: 'USD',
  defaultReminderTime: '09:00',
  notificationsEnabled: true,
};

async function readPersisted(): Promise<Persisted> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return {
      preferredCurrency: parsed.preferredCurrency ?? DEFAULTS.preferredCurrency,
      defaultReminderTime: parsed.defaultReminderTime ?? DEFAULTS.defaultReminderTime,
      notificationsEnabled: parsed.notificationsEnabled ?? DEFAULTS.notificationsEnabled,
    };
  } catch {
    return DEFAULTS;
  }
}

async function writePersisted(next: Persisted) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    const persisted = await readPersisted();
    set({ ...persisted, hydrated: true });
  },

  setPreferredCurrency: async (preferredCurrency) => {
    const next: Persisted = { ...get(), preferredCurrency } as Persisted;
    set({ preferredCurrency });
    await writePersisted(next);
  },

  setDefaultReminderTime: async (defaultReminderTime) => {
    const next: Persisted = { ...get(), defaultReminderTime } as Persisted;
    set({ defaultReminderTime });
    await writePersisted(next);
  },

  setNotificationsEnabled: async (notificationsEnabled) => {
    const next: Persisted = { ...get(), notificationsEnabled } as Persisted;
    set({ notificationsEnabled });
    await writePersisted(next);
  },
}));

void useSettingsStore.getState().hydrate();
