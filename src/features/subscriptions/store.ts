import { create } from 'zustand';
import type { Subscription } from './types';
import { buildBillingHistoryFromSubscription, parseLocalDate } from './buildBillingHistoryFromSubscription';
import { supabase } from '../../lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type SubscriptionSort = 'nearest_renewal' | 'highest_price' | 'alpha' | 'recent';
export type SubscriptionFilter = 'all' | 'active' | 'trial' | 'paused' | 'cancelled';

/* ------------------------------------------------------------------ */
/*  DB ↔ App mapping helpers                                          */
/* ------------------------------------------------------------------ */

type DbRow = Record<string, unknown>;

/** Normalize ISO or YYYY-MM-DD for Postgres `date` columns. */
function toDbDateString(value: string): string {
  return value.split('T')[0];
}

function deriveTrialLengthDays(row: DbRow): number | null {
  if (!(row.is_trial as boolean)) return null;
  const stored = row.trial_length_days;
  if (stored != null && !Number.isNaN(Number(stored))) {
    const n = Number(stored);
    return n > 0 ? n : null;
  }
  const start = row.subscription_start_date as string | undefined;
  const next = row.next_charge_date as string | undefined;
  if (!start || !next) return null;
  const s = parseLocalDate(start);
  const n = parseLocalDate(next);
  if (Number.isNaN(s.getTime()) || Number.isNaN(n.getTime())) return null;
  const days = Math.round((n.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : null;
}

function fromDbRow(row: DbRow): Subscription {
  return {
    id: row.id as string,
    serviceName: row.service_name as string,
    domain: (row.domain as string) ?? undefined,
    category: (row.category as Subscription['category']) ?? 'Other',
    price: Number(row.price),
    currency: (row.currency as Subscription['currency']) ?? 'USD',
    billingCycle: (row.billing_cycle as Subscription['billingCycle']) ?? 'monthly',
    customCycleDays: row.custom_cycle_days != null ? Number(row.custom_cycle_days) : undefined,
    subscriptionStartDate: row.subscription_start_date as string,
    nextChargeDate: row.next_charge_date as string,
    description: (row.description as string) ?? undefined,
    url: (row.url as string) ?? undefined,
    paymentMethod: (row.payment_method as string) ?? undefined,
    list: (row.list as string) ?? 'Personal',
    status: (row.status as Subscription['status']) ?? 'active',
    isTrial: (row.is_trial as boolean) ?? false,
    trialLengthDays: deriveTrialLengthDays(row),
    reminderEnabled: (row.reminder_enabled as boolean) ?? true,
    reminderDaysBefore: Number(row.reminder_days_before ?? 1),
    reminderTime: (row.reminder_time as string) ?? '09:00',
    billingHistory: [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function withHistory(sub: Subscription): Subscription {
  return { ...sub, billingHistory: buildBillingHistoryFromSubscription(sub) };
}

function toDbInsert(
  sub: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'billingHistory' | 'subscriptionStartDate' | 'trialLengthDays'> & {
    subscriptionStartDate?: string;
    trialLengthDays?: number | null;
  }
) {
  return {
    service_name: sub.serviceName,
    domain: sub.domain ?? null,
    category: sub.category,
    price: sub.price,
    currency: sub.currency,
    billing_cycle: sub.billingCycle,
    custom_cycle_days: sub.customCycleDays ?? null,
    subscription_start_date: toDbDateString(
      sub.subscriptionStartDate ?? new Date().toISOString().split('T')[0]
    ),
    next_charge_date: toDbDateString(sub.nextChargeDate),
    description: sub.description ?? null,
    url: sub.url ?? null,
    payment_method: sub.paymentMethod ?? null,
    list: sub.list,
    status: sub.status,
    is_trial: sub.isTrial,
    trial_length_days: sub.isTrial ? (sub.trialLengthDays ?? null) : null,
    reminder_enabled: sub.reminderEnabled,
    reminder_days_before: sub.reminderDaysBefore,
    reminder_time: sub.reminderTime,
  };
}

function toDbUpdate(patch: Partial<Omit<Subscription, 'id' | 'createdAt'>>) {
  const row: Record<string, unknown> = {};
  if (patch.serviceName !== undefined) row.service_name = patch.serviceName;
  if (patch.domain !== undefined) row.domain = patch.domain ?? null;
  if (patch.category !== undefined) row.category = patch.category;
  if (patch.price !== undefined) row.price = patch.price;
  if (patch.currency !== undefined) row.currency = patch.currency;
  if (patch.billingCycle !== undefined) row.billing_cycle = patch.billingCycle;
  if (patch.customCycleDays !== undefined) row.custom_cycle_days = patch.customCycleDays ?? null;
  if (patch.subscriptionStartDate !== undefined) {
    row.subscription_start_date = toDbDateString(patch.subscriptionStartDate);
  }
  if (patch.nextChargeDate !== undefined) row.next_charge_date = toDbDateString(patch.nextChargeDate);
  if (patch.description !== undefined) row.description = patch.description ?? null;
  if (patch.url !== undefined) row.url = patch.url ?? null;
  if (patch.paymentMethod !== undefined) row.payment_method = patch.paymentMethod ?? null;
  if (patch.list !== undefined) row.list = patch.list;
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.isTrial !== undefined) row.is_trial = patch.isTrial;
  if (patch.trialLengthDays !== undefined) {
    row.trial_length_days =
      patch.trialLengthDays != null && patch.trialLengthDays > 0 ? patch.trialLengthDays : null;
  }
  if (patch.isTrial === false) row.trial_length_days = null;
  if (patch.reminderEnabled !== undefined) row.reminder_enabled = patch.reminderEnabled;
  if (patch.reminderDaysBefore !== undefined) row.reminder_days_before = patch.reminderDaysBefore;
  if (patch.reminderTime !== undefined) row.reminder_time = patch.reminderTime;
  return row;
}

/* ------------------------------------------------------------------ */
/*  Preference sync (fire-and-forget)                                  */
/* ------------------------------------------------------------------ */

async function syncPreferences(patch: { sort?: string; filter?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('user_preferences')
    .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });
}

/* ------------------------------------------------------------------ */
/*  Store                                                              */
/* ------------------------------------------------------------------ */

type SubscriptionsState = {
  hydrated: boolean;
  items: Subscription[];
  sort: SubscriptionSort;
  filter: SubscriptionFilter;

  setSort: (sort: SubscriptionSort) => void;
  setFilter: (filter: SubscriptionFilter) => void;

  initialize: () => () => void;

  add: (
    partial: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt' | 'billingHistory' | 'subscriptionStartDate' | 'trialLengthDays'> & {
      subscriptionStartDate?: string;
      trialLengthDays?: number | null;
    }
  ) => Promise<Subscription | null>;

  update: (id: string, patch: Partial<Omit<Subscription, 'id' | 'createdAt'>>) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

export const useSubscriptionsStore = create<SubscriptionsState>()((set, get) => ({
  hydrated: false,
  items: [],
  sort: 'nearest_renewal',
  filter: 'all',

  setSort: (sort) => {
    set({ sort });
    syncPreferences({ sort });
  },

  setFilter: (filter) => {
    set({ filter });
    syncPreferences({ filter });
  },

  initialize: () => {
    async function load() {
      const { data: rows, error } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && rows) {
        const items = (rows as DbRow[]).map(r => withHistory(fromDbRow(r)));
        set({ items, hydrated: true });
      } else {
        set({ hydrated: true });
      }

      const { data: prefs } = await supabase
        .from('user_preferences')
        .select('sort, filter')
        .single();

      if (prefs) {
        set({
          sort: (prefs.sort as SubscriptionSort) ?? 'nearest_renewal',
          filter: (prefs.filter as SubscriptionFilter) ?? 'all',
        });
      }
    }

    load();

    const channel = supabase
      .channel('subscriptions-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        (payload: RealtimePostgresChangesPayload<DbRow>) => {
          const { eventType } = payload;
          if (eventType === 'INSERT') {
            const newSub = withHistory(fromDbRow(payload.new));
            const exists = get().items.some(s => s.id === newSub.id);
            if (!exists) {
              set({ items: [newSub, ...get().items] });
            }
          } else if (eventType === 'UPDATE') {
            const updated = withHistory(fromDbRow(payload.new));
            set({
              items: get().items.map(s =>
                s.id === updated.id ? updated : s
              ),
            });
          } else if (eventType === 'DELETE' && payload.old && (payload.old as DbRow).id) {
            const deletedId = (payload.old as DbRow).id as string;
            set({ items: get().items.filter(s => s.id !== deletedId) });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },

  add: async (partial) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const dbRow = { ...toDbInsert(partial), user_id: user.id };

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(dbRow)
      .select()
      .single();

    if (error) {
      if (__DEV__) console.error('[SubscriptionsStore] add failed:', error.message);
      return null;
    }
    if (!data) return null;

    const sub = withHistory(fromDbRow(data as DbRow));
    if (!get().items.some(s => s.id === sub.id)) {
      set({ items: [sub, ...get().items] });
    }
    return sub;
  },

  update: async (id, patch) => {
    const dbPatch = toDbUpdate(patch);
    if (Object.keys(dbPatch).length > 0) {
      await supabase.from('subscriptions').update(dbPatch).eq('id', id);
    }

    const prev = get().items.find(s => s.id === id);
    if (!prev) return;

    const merged: Subscription = { ...prev, ...patch, updatedAt: new Date().toISOString() };
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
      items: get().items.map(s => (s.id === id ? { ...merged, billingHistory } : s)),
    });
  },

  remove: async (id) => {
    await supabase.from('subscriptions').delete().eq('id', id);
    set({ items: get().items.filter(s => s.id !== id) });
  },
}));

export function selectVisibleSubscriptions(state: Pick<SubscriptionsState, 'items' | 'sort' | 'filter'>) {
  const filtered =
    state.filter === 'all' ? state.items : state.items.filter(s => s.status === state.filter);

  return filtered.slice().sort((a, b) => {
    if (state.sort === 'alpha') return a.serviceName.localeCompare(b.serviceName);
    if (state.sort === 'highest_price') return b.price - a.price;
    if (state.sort === 'recent') return b.createdAt.localeCompare(a.createdAt);
    return a.nextChargeDate.localeCompare(b.nextChargeDate);
  });
}
