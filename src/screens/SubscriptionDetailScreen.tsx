import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CompanyLogo } from '../components/CompanyLogo';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { formatMoney } from '../features/subscriptions/calc';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionDetail'>;

const BG = '#F5F5F5';
const CARD = '#FFFFFF';
const INK = '#0B0803';
const DIM = 'rgba(11,8,3,0.5)';
const SEP = 'rgba(11,8,3,0.07)';
const GREEN = '#30CE5A';

const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly', custom: 'Custom',
};

export function SubscriptionDetailScreen({ navigation, route }: Props) {
  const { subscriptionId } = route.params;
  const sub = useSubscriptionsStore((s) => s.items.find((i) => i.id === subscriptionId));
  const update = useSubscriptionsStore((s) => s.update);
  const remove = useSubscriptionsStore((s) => s.remove);

  if (!sub) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={{ color: INK, padding: 20 }}>Subscription not found.</Text>
      </SafeAreaView>
    );
  }

  const totalSpent = sub.billingHistory
    .filter((e) => e.label === 'Charged' || e.label === 'Subscribed')
    .reduce((sum, e) => sum + e.amount, 0);

  const subscribedDays = Math.floor(
    (Date.now() - new Date(sub.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  const nextDate = new Date(sub.nextChargeDate);
  const nextLabel = nextDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const isCancelled = sub.status === 'cancelled';

  function handleMarkCancelled() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isCancelled) {
      update(sub!.id, { status: 'active' });
    } else {
      Alert.alert(
        'Mark as Cancelled?',
        'This will mark the subscription as cancelled and stop reminders.',
        [
          { text: 'Keep Active', style: 'cancel' },
          {
            text: 'Mark as Cancelled',
            style: 'destructive',
            onPress: () => update(sub!.id, { status: 'cancelled', reminderEnabled: false }),
          },
        ],
      );
    }
  }

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Subscription?',
      `"${sub!.serviceName}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { remove(sub!.id); navigation.goBack(); },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      {/* Nav */}
      <View style={s.navBar}>
        <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [s.navBackBtn, pressed && s.pressed]}>
          <Ionicons name="chevron-back" size={20} color={INK} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={() => navigation.navigate('EditSubscription', { subscriptionId: sub.id })}
          style={({ pressed }) => [s.editBtn, pressed && s.pressed]}
        >
          <Text style={s.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={s.heroWrap}>
          {sub.domain ? (
            <CompanyLogo domain={sub.domain} size={68} rounded={20} fallbackText={sub.serviceName} />
          ) : (
            <View style={s.heroFallback}>
              <Text style={s.heroFallbackText}>{(sub.serviceName[0] ?? '?').toUpperCase()}</Text>
            </View>
          )}
          <Text style={s.heroName}>{sub.serviceName}</Text>
          <Text style={s.heroPrice}>{formatMoney(sub.price, sub.currency)}</Text>
          <View style={s.heroMeta}>
            <StatusBadge status={sub.status} />
            <Text style={s.heroCycle}>{CYCLE_LABELS[sub.billingCycle]}</Text>
          </View>
        </View>

        {/* Detail rows */}
        <View style={s.card}>
          <Row label="Next payment" value={nextLabel} />
          <View style={s.sep} />
          <Row label="Total spent" value={formatMoney(totalSpent, sub.currency)} />
          <View style={s.sep} />
          <Row label="Subscribed" value={`${subscribedDays} day${subscribedDays !== 1 ? 's' : ''}`} />
          <View style={s.sep} />
          <Row label="Category" value={sub.category} />
          <View style={s.sep} />
          <Row label="List" value={sub.list} />
          {sub.paymentMethod ? (
            <>
              <View style={s.sep} />
              <Row label="Payment method" value={sub.paymentMethod} />
            </>
          ) : null}
          {sub.reminderEnabled ? (
            <>
              <View style={s.sep} />
              <Row label="Reminder" value={`${sub.reminderDaysBefore} day${sub.reminderDaysBefore > 1 ? 's' : ''} before`} />
            </>
          ) : null}
          {sub.url ? (
            <>
              <View style={s.sep} />
              <Row label="Website" value={sub.url} />
            </>
          ) : null}
        </View>

        {/* Billing history */}
        <Text style={s.sectionLabel}>BILLING HISTORY</Text>
        <View style={s.card}>
          {sub.billingHistory.length === 0 ? (
            <View style={s.emptyWrap}>
              <Text style={s.emptyText}>No billing history yet.</Text>
            </View>
          ) : (
            sub.billingHistory.slice().reverse().map((entry, idx, arr) => (
              <View key={entry.id}>
                {idx !== 0 && <View style={s.sep} />}
                <View style={s.historyRow}>
                  <View style={s.historyDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.historyLabel}>{entry.label}</Text>
                    <Text style={s.historyDate}>
                      {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <Text style={s.historyAmount}>{formatMoney(entry.amount, entry.currency)}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Notes */}
        {sub.description ? (
          <>
            <Text style={s.sectionLabel}>NOTES</Text>
            <View style={[s.card, { paddingHorizontal: 16, paddingVertical: 14 }]}>
              <Text style={{ fontSize: 14, color: INK, lineHeight: 20 }}>{sub.description}</Text>
            </View>
          </>
        ) : null}

        {/* Actions */}
        <Pressable
          onPress={handleMarkCancelled}
          style={({ pressed }) => [
            s.actionBtn,
            isCancelled ? s.reactivateBtn : s.cancelBtn,
            pressed && s.pressed,
          ]}
        >
          <Text style={[s.actionBtnText, isCancelled && { color: GREEN }]}>
            {isCancelled ? 'Mark as Active' : 'Mark as Cancelled'}
          </Text>
        </Pressable>

        <Pressable onPress={handleDelete} style={({ pressed }) => [s.deleteLink, pressed && s.pressed]}>
          <Text style={s.deleteLinkText}>Delete subscription</Text>
        </Pressable>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      <Text style={s.detailValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    active:    { bg: '#E8F9EE', color: '#1B8A3C', label: 'Active' },
    trial:     { bg: '#EEE6FF', color: '#6B3FBC', label: 'Trial' },
    paused:    { bg: '#FFF3E0', color: '#B05E00', label: 'Paused' },
    cancelled: { bg: 'rgba(11,8,3,0.07)', color: DIM, label: 'Cancelled' },
  };
  const c = configs[status] ?? configs.cancelled;
  return (
    <View style={[s.badge, { backgroundColor: c.bg }]}>
      <Text style={[s.badgeText, { color: c.color }]}>{c.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  pressed: { opacity: 0.75 },
  content: { paddingHorizontal: 16, paddingTop: 4 },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  navBackBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  editBtn: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: CARD,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  editBtnText: { fontSize: 14, fontWeight: '700', color: INK },

  heroWrap: {
    alignItems: 'flex-start',
    paddingVertical: 16, marginBottom: 6,
  },
  heroFallback: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  heroFallbackText: { fontSize: 26, fontWeight: '800', color: INK },
  heroName: { marginTop: 16, fontSize: 32, fontWeight: '800', color: INK },
  heroPrice: { marginTop: 4, fontSize: 24, fontWeight: '600', color: DIM },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  heroCycle: { fontSize: 13, fontWeight: '500', color: DIM },

  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  card: { backgroundColor: CARD, borderRadius: 22 },
  sep: { height: 1, backgroundColor: SEP, marginHorizontal: 16 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: DIM,
    marginTop: 20, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  detailRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  detailLabel: { fontSize: 15, fontWeight: '500', color: DIM },
  detailValue: { fontSize: 15, fontWeight: '600', color: INK, maxWidth: '55%', textAlign: 'right' },

  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  historyDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: 'rgba(11,8,3,0.15)',
  },
  historyLabel: { fontSize: 14, fontWeight: '600', color: INK },
  historyDate: { fontSize: 12, color: DIM, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '700', color: INK },
  emptyWrap: { paddingHorizontal: 16, paddingVertical: 18 },
  emptyText: { fontSize: 14, color: DIM },

  actionBtn: {
    marginTop: 20, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: 'rgba(11,8,3,0.07)' },
  reactivateBtn: { backgroundColor: '#E8F9EE' },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: INK },
  deleteLink: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  deleteLinkText: { fontSize: 14, fontWeight: '500', color: 'rgba(11,8,3,0.4)' },
});
