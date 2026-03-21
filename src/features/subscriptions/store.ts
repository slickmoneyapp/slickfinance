import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Subscription } from './types';
import { buildBillingHistoryFromSubscription } from './buildBillingHistoryFromSubscription';
import { seedSubscriptions } from './seed';

const STORAGE_KEY = 'subscriptions:v5';

/** Fill in any fields added after v1 so old cached data never crashes */
function migrateItem(raw: any): Subscription {
  const base = {
    list: 'Personal',
    isTrial: raw.status === 'trial',
    reminderDaysBefore: 1,
    reminderTime: '09:00',
    url: undefined,
    notificationIds: Array.isArray(raw.notificationIds)
      ? raw.notificationIds
      : raw.notificationId
        ? [raw.notificationId]
        : [],
    billingHistory: [],
    ...raw,
  } as Subscription;
  if (!base.subscriptionStartDate) {
    base.subscriptionStartDate = (base.createdAt ?? nowIso()).split('T')[0];
  }
  return base;
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type SubscriptionSort = 'nearest_renewal' | 'highest_price' | 'alpha' | 'recent';
export type SubscriptionFilter = 'all' | 'active' | 'trial' | 'paused' | 'cancelled';

type SubscriptionsState = {
  hydrated: boolean;
  items: Subscription[];

  sort: SubscriptionSort;
  filter: SubscriptionFilter;

  setSort: (sort: SubscriptionSort) => void;
  setFilter: (filter: SubscriptionFilter) => void;

  add: (
    partial: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'billingHistory' | 'subscriptionStartDate'> & {
      subscriptionStartDate?: string;
    }
  ) => Subscription;
  update: (id: string, patch: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => void;
  remove: (id: string) => void;
  seedIfEmpty: () => void;
};

export const useSubscriptionsStore = create<SubscriptionsState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      items: [],

      sort: 'nearest_renewal',
      filter: 'all',

      setSort: (sort) => set({ sort }),
      setFilter: (filter) => set({ filter }),

      add: (partial) => {
        const created = nowIso();
        const startDate = partial.subscriptionStartDate ?? created.split('T')[0];
        const sub: Subscription = {
          ...partial,
          subscriptionStartDate: startDate,
          id: makeId(),
          createdAt: created,
          updatedAt: created,
          billingHistory: [],
        };
        sub.billingHistory = buildBillingHistoryFromSubscription(sub);
        set({ items: [sub, ...get().items] });
        return sub;
      },

      update: (id, patch) => {
        const updatedAt = nowIso();
        const prev = get().items.find((s) => s.id === id);
        if (!prev) return;
        const merged: Subscription = { ...prev, ...patch, updatedAt };
        const rebuild =
          patch.subscriptionStartDate != null ||
          patch.billingCycle != null ||
          patch.price != null ||
          patch.customCycleDays != null ||
          patch.currency != null;
        const billingHistory = rebuild
          ? buildBillingHistoryFromSubscription(merged)
          : merged.billingHistory;
        set({
          items: get().items.map((s) => (s.id === id ? { ...merged, billingHistory } : s)),
        });
      },

      remove: (id) => {
        set({ items: get().items.filter((s) => s.id !== id) });
      },

      seedIfEmpty: () => {
        if (get().items.length > 0) return;
        set({ items: seedSubscriptions });
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Migrate any items that are missing fields added in later schema versions
          state.items = state.items.map(migrateItem);
          state.seedIfEmpty();
        }
        useSubscriptionsStore.setState({ hydrated: true });
      },
      partialize: (s) => ({
        items: s.items,
        sort: s.sort,
        filter: s.filter,
      }),
    }
  )
);

export function selectVisibleSubscriptions(state: Pick<SubscriptionsState, 'items' | 'sort' | 'filter'>) {
  const filtered =
    state.filter === 'all' ? state.items : state.items.filter((s) => s.status === state.filter);

  const sorted = filtered.slice().sort((a, b) => {
    if (state.sort === 'alpha') return a.serviceName.localeCompare(b.serviceName);
    if (state.sort === 'highest_price') return b.price - a.price;
    if (state.sort === 'recent') return b.createdAt.localeCompare(a.createdAt);
    // nearest renewal
    return a.nextChargeDate.localeCompare(b.nextChargeDate);
  });

  return sorted;
}

