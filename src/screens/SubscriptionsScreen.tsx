import React, { useMemo } from 'react';
import {
  DynamicColorIOS,
  FlatList,
  Image,
  type ListRenderItemInfo,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SFIcon } from '../components/SFIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, figma } from '../ui/theme';
import type { NavigationProp } from '@react-navigation/native';
import { navigateRoot } from '../navigation/navigateRoot';
import { CompanyLogo } from '../components/CompanyLogo';
import { useSubscriptionsStore, selectVisibleSubscriptions } from '../features/subscriptions/store';
import { AnimatedMoneyAmount } from '../components/AnimatedMoneyAmount';
import { formatMoney, getMonthOverMonthSpendPill, monthlySpendTotal } from '../features/subscriptions/calc';
import type { Subscription } from '../features/subscriptions/types';
import { MONTH_NAMES } from '../features/subscriptions/subscriptionCalendar';
import { billingSubtitle, cycleShort } from '../features/subscriptions/subscriptionRowFormatting';
import { useMonthlySpendCountFromOnFocus } from '../hooks/useMonthlySpendCountFromOnFocus';
import { hapticImpact, hapticSelection } from '../ui/haptics';
import { SubscriptionListSkeleton, SkeletonBlock } from '../components/Skeleton';

type Props = { navigation: NavigationProp<any> };

// ─── Design tokens ────────────────────────────────────────────────────────────
const BG = colors.bg;
const CARD = colors.surface;
const INK = colors.text;
const DIM = colors.textMuted;
const SEP = colors.borderSoft;
/** "Active" green from Figma TEXT 273:1689 (node 273:1518) */
const STATUS_ACTIVE = figma.subscriptions273.statusActive;
/** M2M pill — green (spend down): #1BAD40 @ 10% / solid; red (spend up): #C62828 @ 10% / solid */
const MOM_PILL_GREEN_BG = 'rgba(27, 173, 64, 0.1)';
const MOM_PILL_GREEN_TEXT = '#1BAD40';
const MOM_PILL_RED_BG = 'rgba(198, 40, 40, 0.1)';
const MOM_PILL_RED_TEXT = '#C62828';
const MOM_PILL_NEUTRAL_BG = 'rgba(11, 8, 3, 0.07)';
const MOM_PILL_NEUTRAL_TEXT = 'rgba(11, 8, 3, 0.55)';

const iosDynamic = (light: string, dark: string, fallback: string = light) =>
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : fallback;

const IOS_CARD_BG = iosDynamic('#FFFFFF', '#1C1C1E', CARD);
const IOS_PRIMARY_LABEL = iosDynamic('#111111', '#FFFFFF', INK);
const IOS_SECONDARY_LABEL = iosDynamic('rgba(60, 60, 67, 0.62)', 'rgba(235, 235, 245, 0.60)', DIM);
const IOS_SEPARATOR = iosDynamic('rgba(60, 60, 67, 0.24)', 'rgba(84, 84, 88, 0.65)', SEP);
const IOS_ROW_HIGHLIGHT = iosDynamic('rgba(120, 120, 128, 0.12)', 'rgba(118, 118, 128, 0.24)', 'rgba(120, 120, 128, 0.12)');
// ─── Screen ───────────────────────────────────────────────────────────────────
export function SubscriptionsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const items     = useSubscriptionsStore((s) => s.items);
  const sort      = useSubscriptionsStore((s) => s.sort);
  const filter    = useSubscriptionsStore((s) => s.filter);
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

  const listData = hydrated ? visible : [];
  const isEmptyPortfolio = hydrated && items.length === 0;
  const isFilterEmpty = hydrated && items.length > 0 && visible.length === 0;

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

  return (
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
              flexGrow: 1,
            },
          ]}
          ListHeaderComponent={(
            <View style={s.figmaTextColumn}>
            <View style={s.spendingBlockAfterFiltersRemoved}>
              <Text style={s.spendingContext}>Spending in {spendingMonthLabel}</Text>
              <AnimatedMoneyAmount
                amount={monthly}
                currency={currency as any}
                style={s.spendingHeroAmount}
                countFrom={hydrated ? heroMonthlyCountFrom : undefined}
                onCountComplete={hydrated ? onHeroMonthlyCountComplete : undefined}
              />
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
                          momPill.tone === 'same' && s.momPillSame,
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
            </View>
          )}
          ListEmptyComponent={
            !hydrated ? (
              <SubscriptionListSkeleton />
            ) : isEmptyPortfolio ? (
              <View style={s.emptyPortfolioWrap}>
                <Image
                  source={require('../assets/subscriptionsEmptyIllustration.png')}
                  style={s.emptyPortfolioIllustration}
                  resizeMode="contain"
                  accessibilityIgnoresInvertColors
                />
                <Text style={s.emptyPortfolioTitle}>No subscriptions yet</Text>
                <Text style={s.emptyPortfolioSubtitle}>
                  Add one to start tracking your spending
                </Text>
                <Pressable
                  onPress={() => {
                    void hapticImpact();
                    openAdd();
                  }}
                  style={({ pressed }) => [s.emptyPortfolioCta, pressed && s.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Add Subscription"
                >
                  <Text style={s.emptyPortfolioCtaText}>Add Subscription</Text>
                </Pressable>
              </View>
            ) : isFilterEmpty ? (
              <View style={s.emptyFilterCard}>
                <Text style={s.emptyText}>No subscriptions match this filter.</Text>
              </View>
            ) : null
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
  /** Same as `spendingBlock` but extra bottom margin where filter pills used to sit */
  spendingBlockAfterFiltersRemoved: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginTop:
      figma.subscriptions273.titleToSpendingGroupGap -
      figma.subscriptions273.spendingGroupPredecessorStack,
    marginBottom:
      figma.subscriptions273.spendingBlockMarginBottom +
      16 +
      figma.subscriptions273.pillRowMarginBottom,
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
    height: 34,
    paddingLeft: 12,
    paddingRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    flexShrink: 1,
    maxWidth: '100%',
  },
  momPillGreen: { backgroundColor: MOM_PILL_GREEN_BG },
  momPillRed: { backgroundColor: MOM_PILL_RED_BG },
  momPillNeutral: { backgroundColor: MOM_PILL_NEUTRAL_BG },
  momPillSame: { backgroundColor: MOM_PILL_NEUTRAL_BG },
  /** MoM pill — 14 / medium (yearly line uses Invest-style 16 / semibold) */
  momPillText: {
    fontFamily: 'SF Pro Display',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  momPillTextGreen: { color: MOM_PILL_GREEN_TEXT },
  momPillTextRed: { color: MOM_PILL_RED_TEXT },
  momPillTextNeutral: { color: MOM_PILL_NEUTRAL_TEXT },
  momPillTextSame: { color: MOM_PILL_NEUTRAL_TEXT },
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
  /** Empty list when user has no subscriptions yet — no card chrome; sits on screen bg */
  emptyPortfolioWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingTop: 8,
    paddingBottom: 8,
  },
  /** Source asset 540×322 — height 80px, width from aspect ratio */
  emptyPortfolioIllustration: {
    height: 80,
    aspectRatio: 540 / 322,
    marginBottom: 24,
    alignSelf: 'center',
  },
  emptyPortfolioTitle: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: IOS_PRIMARY_LABEL,
    textAlign: 'center',
    alignSelf: 'stretch',
    ...androidTextFix,
  },
  emptyPortfolioSubtitle: {
    marginTop: 8,
    fontFamily: 'SF Pro Display',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '400',
    color: IOS_SECONDARY_LABEL,
    textAlign: 'center',
    alignSelf: 'stretch',
    ...androidTextFix,
  },
  emptyPortfolioCta: {
    marginTop: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: INK,
    borderRadius: 999,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignSelf: 'center',
    flexGrow: 0,
  },
  /** Matches Figma: SF Pro 14 / 510, liga+clig off, −0.23 tracking */
  emptyPortfolioCtaText: {
    fontFamily: 'SF Pro Display',
    fontSize: 14,
    ...Platform.select({
      ios: { fontWeight: '510' as any },
      default: { fontWeight: '500' },
    }),
    color: '#FFFFFF',
    letterSpacing: -0.23,
    ...(Platform.OS !== 'web'
      ? ({ fontFeatureSettings: "'liga' 0, 'clig' 0" } as const)
      : {}),
    ...androidTextFix,
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
});
