import React from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompanyLogo } from '../components/CompanyLogo';
import { TabScreenBackground } from '../components/TabScreenBackground';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { formatMoney } from '../features/subscriptions/calc';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors, radius, spacing } from '../ui/theme';
import { hapticSelection } from '../ui/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionDetail'>;

const CARD = colors.surface;
const INK = colors.text;
const DIM = colors.textMuted;
const SEP = colors.borderSoft;
const GREEN = colors.success;

const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  yearly: 'Yearly',
  custom: 'Custom',
};

function cycleSlash(c: string) {
  return (
    ({ weekly: 'wk', monthly: 'mo', quarterly: 'qtr', yearly: 'yr' } as Record<string, string>)[c] ?? c
  );
}

function formatSubscriptionStartDate(iso: string | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function SubscriptionDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { subscriptionId } = route.params;
  const sub = useSubscriptionsStore((s) => s.items.find((i) => i.id === subscriptionId));
  const update = useSubscriptionsStore((s) => s.update);
  const remove = useSubscriptionsStore((s) => s.remove);

  if (!sub) {
    return (
      <TabScreenBackground variant="figma" edges={['top', 'left', 'right']}>
        <View style={{ flex: 1, padding: 20, justifyContent: 'center' }}>
          <Text style={{ color: INK }}>Subscription not found.</Text>
          <Pressable
            onPress={() => navigation.goBack()}
            style={{ marginTop: 16, paddingVertical: 12 }}
          >
            <Text style={{ color: DIM, fontWeight: '600' }}>Go back</Text>
          </Pressable>
        </View>
      </TabScreenBackground>
    );
  }

  const subscription = sub;

  const totalSpent = subscription.billingHistory
    .filter((e) => e.label === 'Charged' || e.label === 'Subscribed')
    .reduce((sum, e) => sum + e.amount, 0);

  const subscribedDays = Math.floor(
    (Date.now() - new Date(subscription.createdAt).getTime()) / (1000 * 60 * 60 * 24),
  );

  const nextDate = new Date(subscription.nextChargeDate);
  const nextLabel = nextDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const isCancelled = subscription.status === 'cancelled';

  function handleMarkCancelled() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isCancelled) {
      update(subscription.id, { status: 'active' });
    } else {
      Alert.alert(
        'Mark as Cancelled?',
        'This will mark the subscription as cancelled and stop reminders.',
        [
          { text: 'Keep Active', style: 'cancel' },
          {
            text: 'Mark as Cancelled',
            style: 'destructive',
            onPress: () => update(subscription.id, { status: 'cancelled', reminderEnabled: false }),
          },
        ],
      );
    }
  }

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Subscription?',
      `"${subscription.serviceName}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await remove(subscription.id);
            navigation.goBack();
          },
        },
      ],
    );
  }

  function goBack() {
    void hapticSelection();
    navigation.goBack();
  }

  function openEdit() {
    void hapticSelection();
    navigation.navigate('EditSubscription', { subscriptionId: subscription.id });
  }

  const reminderLine = subscription.reminderEnabled
    ? `${subscription.reminderDaysBefore === 0 ? 'Same day' : `${subscription.reminderDaysBefore} day${subscription.reminderDaysBefore > 1 ? 's' : ''} before`} at ${subscription.reminderTime}`
    : 'Off';

  return (
    <TabScreenBackground variant="figma" edges={['top', 'left', 'right']}>
      <View style={s.root}>
        {/* Custom bar — no native stack header / ScreenHeader */}
        {/* Safe area is applied by TabScreenBackground; only add small breathing room */}
        <View style={s.topBar}>
          <View style={s.topBarSide}>
            <Pressable
              onPress={goBack}
              hitSlop={12}
              style={({ pressed }) => [s.iconBtn, pressed && s.pressed]}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={24} color={INK} />
            </Pressable>
          </View>
          <Text style={s.topBarTitle} numberOfLines={1}>
            Subscription
          </Text>
          <View style={[s.topBarSide, { alignItems: 'flex-end' }]}>
            <Pressable
              onPress={openEdit}
              hitSlop={12}
              style={({ pressed }) => [s.editBtn, pressed && s.pressed]}
            >
              <Text style={s.editBtnText}>Edit</Text>
            </Pressable>
          </View>
        </View>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={[s.scrollInner, { paddingBottom: Math.max(insets.bottom, 12) + 20 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero — centered block */}
          <View style={s.hero}>
            {subscription.domain ? (
              <CompanyLogo domain={subscription.domain} size={80} rounded={22} fallbackText={subscription.serviceName} />
            ) : (
              <View style={s.heroFallback}>
                <Text style={s.heroFallbackText}>{(subscription.serviceName[0] ?? '?').toUpperCase()}</Text>
              </View>
            )}
            <Text style={s.heroName}>{subscription.serviceName}</Text>
            <Text style={s.heroPrice}>
              {formatMoney(subscription.price, subscription.currency)} / {cycleSlash(subscription.billingCycle)}
            </Text>
            <Text style={s.heroSub}>
              {subscription.isTrial ? 'Trial' : CYCLE_LABELS[subscription.billingCycle] ?? subscription.billingCycle}
              {subscription.customCycleDays && subscription.billingCycle === 'custom' ? ` · ${subscription.customCycleDays} days` : ''}
            </Text>
            <View style={s.heroBadgeRow}>
              <StatusBadge status={subscription.status} />
            </View>
          </View>

          <Text style={s.sectionHeading}>Information</Text>
          <View style={s.card}>
            <Row label="Next payment" value={nextLabel} />
            <View style={s.sep} />
            <Row
              label="Subscription start"
              value={formatSubscriptionStartDate(subscription.subscriptionStartDate)}
            />
            <View style={s.sep} />
            <Row label="Billing cycle" value={CYCLE_LABELS[subscription.billingCycle] ?? subscription.billingCycle} />
            <View style={s.sep} />
            <Row
              label="Payment method"
              value={subscription.paymentMethod?.trim() ? subscription.paymentMethod : '—'}
            />
            <View style={s.sep} />
            <Row label="Status" value={<StatusBadge status={subscription.status} />} isComponent />
            <View style={s.sep} />
            <Row label="Category" value={subscription.category} />
            <View style={s.sep} />
            <Row label="List" value={subscription.list} />
            <View style={s.sep} />
            <Row label="Total spent" value={formatMoney(totalSpent, subscription.currency)} />
            <View style={s.sep} />
            <Row
              label="Subscribed"
              value={`${subscribedDays} day${subscribedDays !== 1 ? 's' : ''}`}
            />
            <View style={s.sep} />
            <Row label="Reminder" value={reminderLine} />
            {subscription.url ? (
              <>
                <View style={s.sep} />
                <Row label="Website" value={subscription.url} />
              </>
            ) : null}
          </View>

          <Text style={s.sectionHeading}>Billing history</Text>
          <View style={s.card}>
            {subscription.billingHistory.length === 0 ? (
              <View style={s.emptyWrap}>
                <Text style={s.emptyText}>No billing history yet.</Text>
              </View>
            ) : (
              subscription.billingHistory
                .slice()
                .reverse()
                .map((entry, idx) => (
                  <View key={entry.id}>
                    {idx !== 0 && <View style={s.sep} />}
                    <View style={s.historyRow}>
                      <View style={s.historyDot} />
                      <View style={{ flex: 1 }}>
                        <Text style={s.historyLabel}>{entry.label}</Text>
                        <Text style={s.historyDate}>
                          {new Date(entry.date).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>
                      <Text style={s.historyAmount}>{formatMoney(entry.amount, entry.currency)}</Text>
                    </View>
                  </View>
                ))
            )}
          </View>

          {subscription.description ? (
            <>
              <Text style={s.sectionHeading}>Notes</Text>
              <View style={[s.card, s.notesCard]}>
                <Text style={s.notesText}>{subscription.description}</Text>
              </View>
            </>
          ) : null}

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
        </ScrollView>
      </View>
    </TabScreenBackground>
  );
}

function Row({
  label,
  value,
  isComponent,
}: {
  label: string;
  value: React.ReactNode;
  isComponent?: boolean;
}) {
  return (
    <View style={s.detailRow}>
      <Text style={s.detailLabel}>{label}</Text>
      {isComponent ? (
        <View style={s.detailValueWrap}>{value}</View>
      ) : (
        <Text style={s.detailValue} numberOfLines={3}>
          {value}
        </Text>
      )}
    </View>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#E8F9EE', color: '#1B8A3C', label: 'Active' },
    trial: { bg: '#EEE6FF', color: '#6B3FBC', label: 'Trial' },
    paused: { bg: '#FFF3E0', color: '#B05E00', label: 'Paused' },
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
  root: { flex: 1, backgroundColor: 'transparent' },
  pressed: { opacity: 0.75 },
  scroll: { flex: 1 },
  scrollInner: { paddingHorizontal: spacing.screenX },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenX - 4,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topBarSide: {
    width: 72,
    justifyContent: 'center',
  },
  topBarTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: INK,
    textAlign: 'center',
  },
  iconBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignSelf: 'flex-start',
  },
  editBtn: {
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: INK,
  },

  hero: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroFallback: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: CARD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackText: { fontSize: 28, fontWeight: '800', color: INK },
  heroName: {
    marginTop: 16,
    fontSize: 28,
    fontWeight: '800',
    color: INK,
    textAlign: 'center',
  },
  heroPrice: {
    marginTop: 8,
    fontSize: 20,
    fontWeight: '600',
    color: INK,
    textAlign: 'center',
  },
  heroSub: {
    marginTop: 6,
    fontSize: 14,
    fontWeight: '500',
    color: DIM,
    textAlign: 'center',
  },
  heroBadgeRow: { marginTop: 12 },

  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: INK,
    marginBottom: 10,
    marginTop: 8,
  },

  card: {
    backgroundColor: CARD,
    borderRadius: radius.card,
    marginBottom: 20,
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: SEP, marginHorizontal: 16 },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: DIM,
    flexShrink: 0,
  },
  detailValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: INK,
    textAlign: 'right',
  },
  detailValueWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },

  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(11,8,3,0.15)',
  },
  historyLabel: { fontSize: 14, fontWeight: '600', color: INK },
  historyDate: { fontSize: 12, color: DIM, marginTop: 2 },
  historyAmount: { fontSize: 15, fontWeight: '700', color: INK },
  emptyWrap: { paddingHorizontal: 16, paddingVertical: 18 },
  emptyText: { fontSize: 14, color: DIM },

  notesCard: { paddingHorizontal: 16, paddingVertical: 14 },
  notesText: { fontSize: 14, color: INK, lineHeight: 20 },

  actionBtn: {
    marginTop: 8,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { backgroundColor: 'rgba(11,8,3,0.07)' },
  reactivateBtn: { backgroundColor: '#E8F9EE' },
  actionBtnText: { fontSize: 16, fontWeight: '700', color: INK },
  deleteLink: { marginTop: 14, alignItems: 'center', paddingVertical: 10 },
  /** Destructive — matches iOS destructive / common “delete” red */
  deleteLinkText: { fontSize: 15, fontWeight: '600', color: '#E53935' },
});
