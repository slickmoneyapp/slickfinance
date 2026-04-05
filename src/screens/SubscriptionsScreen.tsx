import React, { useMemo } from 'react';
import {
  DynamicColorIOS,
  FlatList,
  type ListRenderItemInfo,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SFIcon } from '../components/SFIcon';
import { MenuView } from '@react-native-menu/menu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, figma } from '../ui/theme';
import type { NavigationProp } from '@react-navigation/native';
import { navigateRoot } from '../navigation/navigateRoot';
import { CompanyLogo } from '../components/CompanyLogo';
import {
  useSubscriptionsStore,
  selectVisibleSubscriptions,
  type SubscriptionFilter,
  type SubscriptionSort,
} from '../features/subscriptions/store';
import { AnimatedMoneyAmount } from '../components/AnimatedMoneyAmount';
import { formatMoney, getMonthOverMonthSpendPill, monthlySpendTotal } from '../features/subscriptions/calc';
import type { Subscription } from '../features/subscriptions/types';
import { MONTH_NAMES } from '../features/subscriptions/subscriptionCalendar';
import { billingSubtitle, cycleShort } from '../features/subscriptions/subscriptionRowFormatting';
import { useMonthlySpendCountFromOnFocus } from '../hooks/useMonthlySpendCountFromOnFocus';
import { hapticImpact, hapticSelection } from '../ui/haptics';
import { SubscriptionListSkeleton, SkeletonBlock } from '../components/Skeleton';

type Props = { navigation: NavigationProp<any> };
type MenuOption<T extends string> = { id: T; label: string };

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = colors.bg;
const CARD = colors.surface;
const INK = colors.text;
const DIM = colors.textMuted;
const SEP = colors.borderSoft;
/** "Active" green from Figma TEXT 273:1689 (node 273:1518) */
const STATUS_ACTIVE = figma.subscriptions273.statusActive;
const GREEN_PILL_BG = '#E8F5E9';
const GREEN_PILL_TEXT = '#1B5E20';
const RED_PILL_BG = '#FFEBEE';
const RED_PILL_TEXT = '#C62828';
const NEUTRAL_PILL_BG = 'rgba(11,8,3,0.07)';
const NEUTRAL_PILL_TEXT = 'rgba(11,8,3,0.55)';
/** "Same vs …" — same red as increase chip text (#C62828), fill at 10% opacity */
const SAME_PILL_BG = 'rgba(198, 40, 40, 0.1)';

const iosDynamic = (light: string, dark: string, fallback: string = light) =>
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : fallback;

const IOS_CARD_BG = iosDynamic('#FFFFFF', '#1C1C1E', CARD);
const IOS_PRIMARY_LABEL = iosDynamic('#111111', '#FFFFFF', INK);
const IOS_SECONDARY_LABEL = iosDynamic('rgba(60, 60, 67, 0.62)', 'rgba(235, 235, 245, 0.60)', DIM);
const IOS_SEPARATOR = iosDynamic('rgba(60, 60, 67, 0.24)', 'rgba(84, 84, 88, 0.65)', SEP);
const IOS_ROW_HIGHLIGHT = iosDynamic('rgba(120, 120, 128, 0.12)', 'rgba(118, 118, 128, 0.24)', 'rgba(120, 120, 128, 0.12)');
const STATUS_OPTIONS: MenuOption<SubscriptionFilter>[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'trial', label: 'Trial' },
  { id: 'paused', label: 'Paused' },
  { id: 'cancelled', label: 'Cancelled' },
];

const SORT_OPTIONS: MenuOption<SubscriptionSort>[] = [
  { id: 'nearest_renewal', label: 'Nearest renewal' },
  { id: 'highest_price', label: 'Highest price' },
  { id: 'alpha', label: 'Alphabetical' },
  { id: 'recent', label: 'Recently added' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────
export function SubscriptionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const items     = useSubscriptionsStore((s) => s.items);
  const sort      = useSubscriptionsStore((s) => s.sort);
  const filter    = useSubscriptionsStore((s) => s.filter);
  const setSort   = useSubscriptionsStore((s) => s.setSort);
  const setFilter = useSubscriptionsStore((s) => s.setFilter);
  const hydrated  = useSubscriptionsStore((s) => s.hydrated);

  const { countFrom: heroMonthlyCountFrom, onCountComplete: onHeroMonthlyCountComplete } =
    useMonthlySpendCountFromOnFocus();

  const visible  = useMemo(() => selectVisibleSubscriptions({ items, sort, filter }), [items, sort, filter]);
  const currency = items[0]?.currency ?? 'USD';
  const monthly  = monthlySpendTotal(items);

  const now = new Date();
  const spendingMonthLabel = MONTH_NAMES[now.getMonth()];
  const yearlyProjection = monthly * 12;

  /** M2M uses full `items` (not `visible`) so it matches the portfolio summary and doesn’t vanish when filters change. */
  const momPill = useMemo(() => {
    if (!hydrated) return null;
    return getMonthOverMonthSpendPill(items);
  }, [hydrated, items]);

  function openDetail(id: string) {
    navigateRoot(navigation as any, 'SubscriptionDetail', { subscriptionId: id });
  }

  function openAdd() {
    navigateRoot(navigation as any, 'AddSubscription');
  }

  const statusMenuActions = useMemo(
    () =>
      STATUS_OPTIONS.map((opt) => ({
        id: opt.id,
        title: opt.label,
        state: filter === opt.id ? 'on' : 'off',
      })),
    [filter],
  );
  const sortMenuActions = useMemo(
    () =>
      SORT_OPTIONS.map((opt) => ({
        id: opt.id,
        title: opt.label,
        state: sort === opt.id ? 'on' : 'off',
      })),
    [sort],
  );
  const selectedStatusLabel = useMemo(
    () => STATUS_OPTIONS.find((opt) => opt.id === filter)?.label ?? 'All',
    [filter],
  );
  const selectedSortLabel = useMemo(
    () => SORT_OPTIONS.find((opt) => opt.id === sort)?.label ?? 'Nearest renewal',
    [sort],
  );

  const listData = hydrated ? visible : [];
  const renderSubscriptionRow = ({ item, index }: ListRenderItemInfo<Subscription>) => {
    const isFirst = index === 0;
    const isLast = index === listData.length - 1;
    return (
      <View style={[s.rowCardItem, isFirst && s.rowCardFirst, isLast && s.rowCardLast]}>
        {!isFirst && <View style={s.sepFull} />}
        <SubscriptionRow sub={item} onPressItem={openDetail} />
      </View>
    );
  };

  return hydrated && items.length === 0 ? (
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          s.emptyStateWrap,
          { minHeight: Platform.OS === 'ios' ? windowHeight + 1 : windowHeight },
        ]}
        contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
        alwaysBounceVertical
        bounces
      >
        <View style={s.emptyStateCard}>
            <View style={s.emptyStateIconCircle}>
              <SFIcon name="doc.text" size={36} color={colors.textMuted} />
            </View>
            <Text style={s.emptyStateTitle}>No subscriptions yet</Text>
            <Text style={s.emptyStateSubtitle}>
              Track your recurring payments and{'\n'}stay on top of your spending
            </Text>
            <Pressable
              onPress={() => {
                void hapticImpact();
                openAdd();
              }}
              style={({ pressed }) => [s.emptyStateCta, pressed && s.pressed]}
            >
              <SFIcon name="plus" size={20} color="#FFFFFF" />
              <Text style={s.emptyStateCtaText}>Add Your First Subscription</Text>
            </Pressable>
          </View>
      </ScrollView>
    ) : (
      <FlatList
          style={{ flex: 1 }}
          data={listData}
          keyExtractor={(item) => item.id}
          renderItem={renderSubscriptionRow}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
          alwaysBounceVertical
          bounces
          scrollEventThrottle={16}
          contentContainerStyle={[
            s.listContent,
            {
              minHeight: Platform.OS === 'ios' ? windowHeight + 1 : windowHeight,
              paddingBottom: insets.bottom + 16,
            },
          ]}
          ListHeaderComponent={(
            <View style={s.figmaTextColumn}>
            <View style={s.spendingBlock}>
              <Text style={s.spendingContext}>Spending in {spendingMonthLabel}</Text>
              {hydrated ? (
                <AnimatedMoneyAmount
                  amount={monthly}
                  currency={currency as any}
                  style={s.spendingHeroAmount}
                  countFrom={heroMonthlyCountFrom}
                  onCountComplete={onHeroMonthlyCountComplete}
                />
              ) : (
                <SkeletonBlock width={200} height={48} borderRadius={12} style={{ marginBottom: 14 }} />
              )}
              <View style={s.spendingBottomRow}>
                {hydrated ? (
                  <>
                    {momPill ? (
                      <View
                        style={[
                          s.momPill,
                          momPill.tone === 'green' && s.momPillGreen,
                          momPill.tone === 'red' && s.momPillRed,
                          momPill.tone === 'neutral' && s.momPillNeutral,
                        ]}
                        accessibilityRole="text"
                        accessibilityLabel={momPill.label}
                      >
                        <Text
                          style={[
                            s.momPillText,
                            momPill.tone === 'green' && s.momPillTextGreen,
                            momPill.tone === 'red' && s.momPillTextRed,
                            momPill.tone === 'neutral' && s.momPillTextNeutral,
                            momPill.tone === 'same' && s.momPillTextSame,
                            androidTextFix,
                          ]}
                        >
                          {momPill.label}
                        </Text>
                      </View>
                    ) : null}
                    <Text
                      style={[
                        s.spendingYearly,
                        momPill ? s.spendingYearlyInRow : null,
                        androidTextFix,
                      ]}
                    >
                      {formatMoney(yearlyProjection, currency as any)}/year
                    </Text>
                  </>
                ) : (
                  <SkeletonBlock width={140} height={18} borderRadius={8} />
                )}
              </View>
            </View>

            <View style={s.pillRow}>
              <MenuView
                shouldOpenOnLongPress={false}
                actions={statusMenuActions as any}
                onPressAction={({ nativeEvent }) => {
                  void hapticSelection();
                  setFilter(nativeEvent.event as SubscriptionFilter);
                }}
              >
                <View style={s.pill}>
                  <View style={s.pillInnerRow}>
                    <Text style={s.pillText}>{selectedStatusLabel}</Text>
                    <SFIcon name="chevron.down" size={13} color={colors.textMuted} />
                  </View>
                </View>
              </MenuView>
              <MenuView
                shouldOpenOnLongPress={false}
                actions={sortMenuActions as any}
                onPressAction={({ nativeEvent }) => {
                  void hapticSelection();
                  setSort(nativeEvent.event as SubscriptionSort);
                }}
              >
                <View style={s.pill}>
                  <View style={s.pillInnerRow}>
                    <Text style={s.pillText}>{selectedSortLabel}</Text>
                    <SFIcon name="chevron.down" size={13} color={colors.textMuted} />
                  </View>
                </View>
              </MenuView>
            </View>
            </View>
          )}
          ListEmptyComponent={
            !hydrated ? (
              <SubscriptionListSkeleton />
            ) : (
              <View style={s.emptyFilterCard}>
                <Text style={s.emptyText}>No subscriptions match this filter.</Text>
              </View>
            )
          }
        />
    );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────
function SubscriptionRow({ sub, onPressItem }: { sub: Subscription; onPressItem: (id: string) => void }) {
  const statusLabel = sub.status.charAt(0).toUpperCase() + sub.status.slice(1);
  const statusColor =
    sub.status === 'active' ? STATUS_ACTIVE
      : sub.status === 'trial' ? '#6B3FBC'
        : sub.status === 'paused' ? '#B05E00'
          : DIM;

  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPressItem(sub.id);
      }}
      style={({ pressed }) => [s.subRow, pressed && s.subRowPressed]}
    >
      <View style={s.logoCircle}>
        {sub.domain ? (
          <CompanyLogo domain={sub.domain} size={28} rounded={14} fallbackText={sub.serviceName} />
        ) : (
          <FallbackLogo name={sub.serviceName} />
        )}
      </View>
      <View style={s.rowLeftCol}>
        <Text style={s.rowName} numberOfLines={1}>{sub.serviceName}</Text>
        <Text style={s.rowBillingLine} numberOfLines={1}>{billingSubtitle(sub.nextChargeDate)}</Text>
      </View>
      <View style={s.rowRightCol}>
        <Text style={s.rowPriceRight}>
          {formatMoney(sub.price, sub.currency)} / {cycleShort(sub.billingCycle)}
        </Text>
        <Text style={[s.rowStatusText, { color: statusColor }]}>{statusLabel}</Text>
      </View>
    </Pressable>
  );
}

function FallbackLogo({ name }: { name: string }) {
  return (
    <View style={s.fallbackLogoInner}>
      <Text style={s.fallbackText}>{(name[0] ?? '?').toUpperCase()}</Text>
    </View>
  );
}

/** Android adds extra font padding; disabling matches Figma vertical metrics */
const androidTextFix =
  Platform.OS === 'android' ? ({ includeFontPadding: false } as const) : {};

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pressed: { opacity: 0.75 },

  /** 16px card inset from screen; text column uses +20 inside `figmaTextColumn` → 36px */
  listContent: {
    paddingHorizontal: figma.subscriptions273.cardInsetX,
    paddingTop: 4,
  },
  figmaTextColumn: {
    paddingHorizontal: figma.subscriptions273.textColumnGutterX,
    alignSelf: 'stretch',
  },

  spendingBlock: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginTop:
      figma.subscriptions273.titleToSpendingGroupGap -
      figma.subscriptions273.spendingGroupPredecessorStack,
    marginBottom: figma.subscriptions273.spendingBlockMarginBottom,
  },
  spendingContext: {
    ...figma.subscriptions273.spendingContext,
    marginBottom: figma.subscriptions273.spendingGroupRowGap,
    textAlign: 'left',
    alignSelf: 'stretch',
    ...androidTextFix,
  },
  spendingHeroAmount: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    ...figma.heroNumber,
    marginBottom: figma.subscriptions273.spendingGroupHeroToAnnualGap,
    textAlign: 'left',
    alignSelf: 'stretch',
    ...androidTextFix,
  },
  spendingBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
    gap: 12,
    flexWrap: 'wrap',
  },
  momPill: {
    flexDirection: 'row',
    minHeight: 32,
    paddingVertical: 6,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    flexShrink: 1,
    maxWidth: '100%',
  },
  /** MoM pill — 14 / medium (yearly line uses Invest-style 16 / semibold) */
  momPillText: {
    fontFamily: 'SF Pro Display',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  momPillGreen: { backgroundColor: GREEN_PILL_BG },
  momPillTextGreen: { color: GREEN_PILL_TEXT },
  momPillRed: { backgroundColor: RED_PILL_BG },
  momPillTextRed: { color: RED_PILL_TEXT },
  momPillNeutral: { backgroundColor: NEUTRAL_PILL_BG },
  momPillTextNeutral: { color: NEUTRAL_PILL_TEXT },
  momPillSame: { backgroundColor: SAME_PILL_BG },
  momPillTextSame: { color: RED_PILL_TEXT },
  /** Matches InvestScreen `monthlyLabel` (Monthly investment) */
  spendingYearly: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: '#616161',
    textAlign: 'left',
    alignSelf: 'stretch',
    ...androidTextFix,
  },
  spendingYearlyInRow: {
    alignSelf: 'auto',
    textAlign: 'left',
    flexShrink: 0,
  },

  pillRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: figma.subscriptions273.pillRowGap,
    marginTop: 16,
    marginBottom: figma.subscriptions273.pillRowMarginBottom,
    alignSelf: 'stretch',
  },
  pill: {
    ...figma.subscriptions273.pill,
  },
  pillInnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pillText: {
    ...figma.subscriptions273.pillLabel,
    ...androidTextFix,
  },

  rowCardItem: {
    backgroundColor: IOS_CARD_BG,
    overflow: 'hidden'
  },
  rowCardFirst: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  rowCardLast: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 2,
  },
  emptyFilterCard: {
    backgroundColor: IOS_CARD_BG,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  sepFull: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: 86,
    marginRight: figma.subscriptions273.rowPaddingH,
  },

  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: figma.subscriptions273.rowGap,
    paddingHorizontal: figma.subscriptions273.rowPaddingH,
    paddingVertical: 16,
  },
  subRowPressed: {
    backgroundColor: IOS_ROW_HIGHLIGHT,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  rowLeftCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  rowName: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: IOS_PRIMARY_LABEL,
    textAlign: 'left',
    ...androidTextFix,
  },
  rowBillingLine: {
    marginTop: 2,
    fontFamily: 'SF Pro Display',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    color: IOS_SECONDARY_LABEL,
    textAlign: 'left',
    ...androidTextFix,
  },
  rowRightCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 88,
  },
  rowPriceRight: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: IOS_PRIMARY_LABEL,
    textAlign: 'right',
    ...androidTextFix,
  },
  rowStatusText: {
    marginTop: 2,
    fontFamily: 'SF Pro Display',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    textAlign: 'right',
    ...androidTextFix,
  },
  fallbackLogoInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fallbackText: { fontSize: 17, fontWeight: '800', color: INK },

  emptyText: { textAlign: 'left', fontSize: 14, fontWeight: '500', color: DIM },

  emptyStateWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyStateCard: {
    backgroundColor: CARD,
    borderRadius: 24,
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: 'center',
    alignSelf: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyStateIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 22,
    letterSpacing: -0.5,
    color: INK,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontFamily: 'SF Pro Display',
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    color: DIM,
    textAlign: 'center',
    marginBottom: 32,
  },
  emptyStateCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: INK,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignSelf: 'stretch',
  },
  emptyStateCtaText: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
