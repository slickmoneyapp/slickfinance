import React, { useMemo, useState } from 'react';
import {
  Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabsParamList } from '../../App';
import { CompanyLogo } from '../components/CompanyLogo';
import {
  useSubscriptionsStore, selectVisibleSubscriptions,
  type SubscriptionFilter, type SubscriptionSort,
} from '../features/subscriptions/store';
import { activeSubscriptionsCount, formatMoney, monthlySpendTotal } from '../features/subscriptions/calc';
import type { Subscription } from '../features/subscriptions/types';

type Props = BottomTabScreenProps<RootTabsParamList, 'Subscriptions'>;

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = '#F5F5F5';
const CARD = '#FFFFFF';
const INK = '#0B0803';
const DIM = 'rgba(11,8,3,0.5)';
const SEP = 'rgba(11,8,3,0.07)';
const GREEN = '#30CE5A';

// ─── Calendar helpers ─────────────────────────────────────────────────────────
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstWeekday(y: number, m: number) { return (new Date(y, m, 1).getDay() + 6) % 7; }

// ─── Screen ───────────────────────────────────────────────────────────────────
export function SubscriptionsScreen({ navigation }: Props) {
  const items     = useSubscriptionsStore((s) => s.items);
  const sort      = useSubscriptionsStore((s) => s.sort);
  const filter    = useSubscriptionsStore((s) => s.filter);
  const setSort   = useSubscriptionsStore((s) => s.setSort);
  const setFilter = useSubscriptionsStore((s) => s.setFilter);
  const hydrated  = useSubscriptionsStore((s) => s.hydrated);

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const visible  = useMemo(() => selectVisibleSubscriptions({ items, sort, filter }), [items, sort, filter]);
  const currency = items[0]?.currency ?? 'USD';
  const monthly  = monthlySpendTotal(items);
  const active   = activeSubscriptionsCount(items);

  function openDetail(id: string) {
    (navigation as any).getParent()?.navigate('SubscriptionDetail', { subscriptionId: id });
  }

  function openAdd() {
    (navigation as any).getParent()?.navigate('AddSubscription');
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.pageTitle}>Subscriptions</Text>
          <Text style={s.pageSub}>
            {hydrated ? `${formatMoney(monthly, currency)} / mo · ${active} active` : 'Loading…'}
          </Text>
        </View>
        <Pressable onPress={openAdd} style={({ pressed }) => [s.addBtn, pressed && s.pressed]}>
          <Ionicons name="add" size={20} color="#fff" />
        </Pressable>
      </View>

      {/* Segmented switcher */}
      <View style={s.switcher}>
        <SwitchTab
          label="Subscriptions"
          icon="list-outline"
          active={view === 'list'}
          onPress={() => setView('list')}
        />
        <SwitchTab
          label="Calendar"
          icon="calendar-outline"
          active={view === 'calendar'}
          onPress={() => setView('calendar')}
        />
      </View>

      {view === 'list' ? (
        <ListView
          visible={visible}
          currency={currency}
          filter={filter}
          sort={sort}
          setFilter={setFilter}
          setSort={setSort}
          onPressItem={openDetail}
        />
      ) : (
        <CalendarView
          items={items}
          currency={currency}
          calMonth={calMonth}
          setCalMonth={setCalMonth}
          onPressItem={openDetail}
        />
      )}
    </SafeAreaView>
  );
}

// ─── List view ────────────────────────────────────────────────────────────────
function ListView({
  visible, currency, filter, sort, setFilter, setSort, onPressItem,
}: {
  visible: Subscription[];
  currency: string;
  filter: SubscriptionFilter;
  sort: SubscriptionSort;
  setFilter: (f: SubscriptionFilter) => void;
  setSort: (s: SubscriptionSort) => void;
  onPressItem: (id: string) => void;
}) {
  return (
    <ScrollView contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false}>
      <ChipRow
        value={filter}
        options={[
          { id: 'all', label: 'All' }, { id: 'active', label: 'Active' },
          { id: 'trial', label: 'Trial' }, { id: 'paused', label: 'Paused' },
          { id: 'cancelled', label: 'Cancelled' },
        ]}
        onChange={(v) => setFilter(v as SubscriptionFilter)}
      />
      <ChipRow
        value={sort}
        options={[
          { id: 'nearest_renewal', label: 'Nearest' }, { id: 'highest_price', label: 'Highest' },
          { id: 'alpha', label: 'A–Z' }, { id: 'recent', label: 'Recent' },
        ]}
        onChange={(v) => setSort(v as SubscriptionSort)}
        style={{ marginTop: 8 }}
      />

      <View style={[s.card, { marginTop: 14 }]}>
        {visible.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 22 }}>
            <Text style={s.emptyText}>No subscriptions here. Tap + to add one.</Text>
          </View>
        ) : (
          visible.map((sub, idx) => (
            <View key={sub.id}>
              {idx !== 0 && <View style={[s.sep, { marginLeft: 70 }]} />}
              <Pressable
                onPress={() => onPressItem(sub.id)}
                style={({ pressed }) => [s.subRow, pressed && s.pressed]}
              >
                {sub.domain ? (
                  <CompanyLogo domain={sub.domain} size={44} rounded={13} fallbackText={sub.serviceName} />
                ) : (
                  <FallbackLogo name={sub.serviceName} />
                )}
                <View style={{ flex: 1 }}>
                  <View style={s.rowTopLine}>
                    <Text style={s.rowName} numberOfLines={1}>{sub.serviceName}</Text>
                    <StatusBadge status={sub.status} />
                  </View>
                  <Text style={s.rowMeta} numberOfLines={1}>
                    {formatMoney(sub.price, sub.currency)} / {cycleShort(sub.billingCycle)}
                    {'  ·  '}next {dateLabel(sub.nextChargeDate)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={15} color="rgba(11,8,3,0.2)" />
              </Pressable>
            </View>
          ))
        )}
      </View>
      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

// ─── Calendar view ────────────────────────────────────────────────────────────
function CalendarView({
  items, currency, calMonth, setCalMonth, onPressItem,
}: {
  items: Subscription[];
  currency: string;
  calMonth: { year: number; month: number };
  setCalMonth: (v: { year: number; month: number }) => void;
  onPressItem: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const cellSize = Math.floor((width - 32) / 7);
  const { year, month } = calMonth;
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const renewalMap = useMemo(() => {
    const map: Record<number, Subscription[]> = {};
    for (const sub of items) {
      if (sub.status === 'cancelled') continue;
      const d = new Date(sub.nextChargeDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        (map[d.getDate()] ??= []).push(sub);
      }
    }
    return map;
  }, [items, year, month]);

  const monthTotal = Object.values(renewalMap).flat().reduce((t, s) => t + s.price, 0);
  const upcomingTotal = Object.entries(renewalMap)
    .filter(([d]) => Number(d) >= (isCurrentMonth ? today.getDate() : 1))
    .flatMap(([, ss]) => ss)
    .reduce((t, s) => t + s.price, 0);

  function prev() {
    setCalMonth(month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  }
  function next() {
    setCalMonth(month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstWeekday(year, month);
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 110 }} showsVerticalScrollIndicator={false}>
      {/* Month header */}
      <View style={s.calHeader}>
        <Pressable onPress={prev} style={({ pressed }) => [s.calNavBtn, pressed && s.pressed]}>
          <Ionicons name="chevron-back" size={18} color={INK} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.calMonthTitle}>{MONTHS[month]} {year}</Text>
          <Text style={s.calTotals}>
            <Text style={s.calTotalBold}>{formatMoney(monthTotal, currency as any)} total</Text>
            <Text style={s.calTotalDim}>{'  ·  '}{formatMoney(upcomingTotal, currency as any)} upcoming</Text>
          </Text>
        </View>
        <Pressable onPress={next} style={({ pressed }) => [s.calNavBtn, pressed && s.pressed]}>
          <Ionicons name="chevron-forward" size={18} color={INK} />
        </Pressable>
      </View>

      {/* Today button */}
      <View style={{ alignItems: 'flex-end', paddingHorizontal: 16, marginBottom: 8 }}>
        <Pressable
          onPress={() => setCalMonth({ year: today.getFullYear(), month: today.getMonth() })}
          style={({ pressed }) => [s.todayBtn, pressed && s.pressed]}
        >
          <Text style={s.todayBtnText}>Today</Text>
        </Pressable>
      </View>

      {/* Day labels */}
      <View style={[s.calDayRow, { paddingHorizontal: 16 }]}>
        {DAYS.map((d) => (
          <Text key={d} style={[s.calDayLabel, { width: cellSize }]}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      <View style={{ paddingHorizontal: 16 }}>
        {Array.from({ length: cells.length / 7 }, (_, row) => (
          <View key={row} style={s.calRow}>
            {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
              const isToday = isCurrentMonth && day === today.getDate();
              const subs = day ? (renewalMap[day] ?? []) : [];
              return (
                <View key={col} style={[s.calCell, { width: cellSize, minHeight: cellSize + 8 }]}>
                  {day != null && (
                    <>
                      <View style={[s.calDayNumWrap, isToday && s.calDayNumToday]}>
                        <Text style={[s.calDayNum, isToday && s.calDayNumTextToday]}>{day}</Text>
                      </View>
                      {subs.length > 0 && (
                        <View style={s.calLogos}>
                          {subs.slice(0, 2).map((sub) => (
                            <Pressable
                              key={sub.id}
                              onPress={() => onPressItem(sub.id)}
                              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                            >
                              {sub.domain ? (
                                <CompanyLogo domain={sub.domain} size={20} rounded={6} fallbackText={sub.serviceName} />
                              ) : (
                                <View style={s.calFallback}>
                                  <Text style={s.calFallbackText}>{(sub.serviceName[0] ?? '?').toUpperCase()}</Text>
                                </View>
                              )}
                            </Pressable>
                          ))}
                          {subs.length > 2 && (
                            <Text style={s.calMore}>+{subs.length - 2}</Text>
                          )}
                        </View>
                      )}
                    </>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function SwitchTab({ label, icon, active, onPress }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.switchTab, active && s.switchTabActive, pressed && s.pressed]}
    >
      <Ionicons name={icon} size={15} color={active ? INK : DIM} />
      <Text style={[s.switchTabText, active && s.switchTabTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ChipRow({ value, options, onChange, style }: {
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  style?: object;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.chipRow, style]}>
      {options.map((o) => (
        <Pressable
          key={o.id}
          onPress={() => onChange(o.id)}
          style={({ pressed }) => [s.chip, o.id === value && s.chipActive, pressed && s.pressed]}
        >
          <Text style={[s.chipText, o.id === value && s.chipTextActive]}>{o.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    active:    { bg: '#E8F9EE', color: '#1B8A3C' },
    trial:     { bg: '#EEE6FF', color: '#6B3FBC' },
    paused:    { bg: '#FFF3E0', color: '#B05E00' },
    cancelled: { bg: 'rgba(11,8,3,0.06)', color: DIM },
  };
  const c = map[status] ?? map.cancelled;
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.color }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </View>
  );
}

function FallbackLogo({ name }: { name: string }) {
  return (
    <View style={s.fallbackLogo}>
      <Text style={s.fallbackText}>{(name[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

function dateLabel(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'soon';
  const diff = Math.round((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff <= 0) return 'today';
  if (diff === 1) return 'tomorrow';
  return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
}

function cycleShort(c: string) {
  return ({ weekly: 'wk', monthly: 'mo', quarterly: 'qtr', yearly: 'yr' } as Record<string, string>)[c] ?? c;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  pressed: { opacity: 0.75 },

  header: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', color: INK },
  pageSub: { marginTop: 3, fontSize: 13, fontWeight: '500', color: DIM },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: INK, alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },

  switcher: {
    flexDirection: 'row', marginHorizontal: 16,
    backgroundColor: CARD, borderRadius: 14,
    padding: 4, marginBottom: 14,
  },
  switchTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: 11,
  },
  switchTabActive: { backgroundColor: BG },
  switchTabText: { fontSize: 13, fontWeight: '600', color: DIM },
  switchTabTextActive: { color: INK },

  listContent: { paddingHorizontal: 16 },
  chipRow: { gap: 8, paddingVertical: 4 },
  chip: {
    paddingVertical: 7, paddingHorizontal: 13,
    borderRadius: 999, backgroundColor: CARD,
  },
  chipActive: { backgroundColor: INK },
  chipText: { fontSize: 13, fontWeight: '600', color: DIM },
  chipTextActive: { color: '#FFFFFF' },

  card: { backgroundColor: CARD, borderRadius: 22 },
  sep: { height: 1, backgroundColor: SEP },
  subRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, paddingHorizontal: 14, paddingVertical: 13,
  },
  rowTopLine: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 8,
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '700', color: INK },
  rowMeta: { marginTop: 3, fontSize: 12, fontWeight: '500', color: DIM },
  badge: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  fallbackLogo: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  fallbackText: { fontSize: 17, fontWeight: '800', color: INK },
  emptyText: { textAlign: 'center', fontSize: 14, fontWeight: '500', color: DIM },

  // Calendar
  calHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 4, paddingBottom: 6,
  },
  calNavBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  calMonthTitle: { fontSize: 20, fontWeight: '800', color: INK },
  calTotals: { marginTop: 2, fontSize: 12 },
  calTotalBold: { fontWeight: '700', color: INK },
  calTotalDim: { fontWeight: '500', color: DIM },
  todayBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 14, backgroundColor: CARD,
  },
  todayBtnText: { fontSize: 12, fontWeight: '700', color: INK },
  calDayRow: { flexDirection: 'row', marginBottom: 4 },
  calDayLabel: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: DIM, paddingVertical: 4 },
  calRow: { flexDirection: 'row' },
  calCell: {
    alignItems: 'center', paddingTop: 6, paddingBottom: 4,
    borderTopWidth: 1, borderTopColor: SEP,
  },
  calDayNumWrap: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  calDayNumToday: { backgroundColor: INK },
  calDayNum: { fontSize: 12, fontWeight: '600', color: DIM },
  calDayNumTextToday: { color: '#fff', fontWeight: '800' },
  calLogos: { flexDirection: 'row', flexWrap: 'wrap', gap: 2, marginTop: 3, justifyContent: 'center' },
  calFallback: {
    width: 20, height: 20, borderRadius: 6,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  calFallbackText: { fontSize: 8, fontWeight: '800', color: INK },
  calMore: { fontSize: 8, fontWeight: '800', color: DIM, marginTop: 2 },
});
