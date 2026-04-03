import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Linking,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SFIcon } from '../components/SFIcon';
import Svg, { Path } from 'react-native-svg';
import { hapticSelection } from '../ui/haptics';
import type { NavigationProp } from '@react-navigation/native';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { formatMoney, monthlySpendTotal, subscriptionMonthlyEquivalent } from '../features/subscriptions/calc';
import type { CurrencyCode } from '../features/subscriptions/types';
import { colors, radius, spacing } from '../ui/theme';
import { SurfaceCard } from '../ui/components';
import { TabScreenBackground } from '../components/TabScreenBackground';

type Props = { navigation: NavigationProp<any> };

const BG = colors.bg;
const CARD = colors.surface;
const INK = colors.text;
const DIM = colors.textMuted;
const SEP = colors.borderSoft;
const ACCENT = '#6D62FF';
const GREEN = colors.success;

const AFFILIATE_ROBINHOOD = 'https://robinhood.com/?ref=budgetplanner&utm_source=budgetplanner&utm_medium=affiliate';
const AFFILIATE_WEBULL = 'https://www.webull.com/?source=budgetplanner&utm_source=budgetplanner&utm_medium=affiliate';

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

function futureValue(monthlyContribution: number, annualRate: number, years: number) {
  const r = annualRate / 12;
  const n = years * 12;
  if (r <= 0) return monthlyContribution * n;
  return monthlyContribution * ((Math.pow(1 + r, n) - 1) / r);
}

function useAnimatedNumber(target: number, duration = 240) {
  const anim = useRef(new Animated.Value(target)).current;
  const [value, setValue] = useState(target);
  useEffect(() => {
    const id = anim.addListener(({ value: v }) => setValue(v));
    Animated.timing(anim, { toValue: target, duration, useNativeDriver: false }).start();
    return () => anim.removeListener(id);
  }, [anim, duration, target]);
  return value;
}

function ProjectionChart({ points }: { points: number[] }) {
  const width = 320;
  const height = 90;
  const maxVal = Math.max(...points, 1);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1 || 1)) * width;
      const y = height - (p / maxVal) * (height - 6);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <View style={s.chartWrap}>
      <Svg width="100%" height={height + 4} viewBox={`0 0 ${width} ${height + 4}`}>
        <Path d={path} stroke={ACCENT} strokeWidth={2.6} fill="none" />
      </Svg>
    </View>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (next: number) => void;
}) {
  const trackWidth = 260;
  const ratio = (value - min) / (max - min);
  const thumbX = ratio * trackWidth;

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const x = e.nativeEvent.locationX;
          onChange(clamp(Math.round(min + (x / trackWidth) * (max - min)), min, max));
        },
        onPanResponderMove: (e) => {
          const x = e.nativeEvent.locationX;
          onChange(clamp(Math.round(min + (x / trackWidth) * (max - min)), min, max));
        },
      }),
    [max, min, onChange]
  );

  return (
    <View style={{ gap: 8 }}>
      <View style={s.sliderHead}>
        <Text style={s.sliderLabel}>{label}</Text>
        <Text style={s.sliderValue}>{value}{suffix}</Text>
      </View>
      <View style={s.sliderTrackBox} {...responder.panHandlers}>
        <View style={s.sliderTrack} />
        <View style={[s.sliderFill, { width: thumbX }]} />
        <View style={[s.sliderThumb, { left: thumbX - 9 }]} />
      </View>
    </View>
  );
}

export function InvestScreen({ navigation }: Props) {
  const items = useSubscriptionsStore((s) => s.items);

  const [savedPercent, setSavedPercent] = useState(30);
  const [years, setYears] = useState(20);
  const [scenario, setScenario] = useState<'conservative' | 'average'>('average');

  const monthlySubscriptions = monthlySpendTotal(items);
  const hasData = monthlySubscriptions > 0;
  const currency: CurrencyCode = (items[0]?.currency ?? 'USD') as CurrencyCode;
  const monthlyBase = hasData ? monthlySubscriptions : 180;
  const yearly = monthlyBase * 12;
  const annualRate = scenario === 'conservative' ? 0.06 : 0.08;

  const redirectedMonthly = monthlyBase * (savedPercent / 100);
  const projectedValue = futureValue(redirectedMonthly, annualRate, years);
  const totalContributed = redirectedMonthly * years * 12;
  const growth = Math.max(0, projectedValue - totalContributed);

  const projectedAnim = useAnimatedNumber(projectedValue);
  const redirectedAnim = useAnimatedNumber(redirectedMonthly);

  const chartPoints = useMemo(() => {
    const arr: number[] = [];
    for (let y = 1; y <= years; y += 1) arr.push(futureValue(redirectedMonthly, annualRate, y));
    return arr;
  }, [annualRate, redirectedMonthly, years]);

  const optimizeMonthlySaved = useMemo(() => {
    const active = items
      .filter((i) => i.status === 'active' || i.status === 'trial')
      .map((i) => subscriptionMonthlyEquivalent(i))
      .sort((a, b) => b - a);
    return (active[0] ?? 0) + (active[1] ?? 0);
  }, [items]);

  return (
    <TabScreenBackground variant="figma" edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">
        <SurfaceCard style={s.mainCard}>
          <Text style={s.kicker}>Based on your spending</Text>
          <Text style={s.spendLine}>You spend {formatMoney(monthlyBase, currency)}/month on subscriptions</Text>
          <Text style={s.spendSub}>About {formatMoney(yearly, currency)} per year.</Text>
          {!hasData ? <Text style={s.hint}>Add subscriptions to replace this estimate with your real data.</Text> : null}

          <View style={s.heroBlock}>
            <Text style={s.heroIntro}>If you saved {savedPercent}% of this</Text>
            <Text style={s.heroSmall}>{formatMoney(redirectedAnim, currency)}/month redirected</Text>
            <Text style={s.heroValue}>{formatMoney(projectedAnim, currency)}</Text>
            <Text style={s.heroFoot}>Potential value in {years} years</Text>
          </View>

          <ProjectionChart points={chartPoints} />

          <View style={s.summaryRows}>
            <View style={s.summaryRow}><Text style={s.summaryKey}>Contributed</Text><Text style={s.summaryVal}>{formatMoney(totalContributed, currency)}</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryKey}>Estimated growth</Text><Text style={s.summaryVal}>{formatMoney(growth, currency)}</Text></View>
            <View style={s.summaryRow}><Text style={s.summaryKey}>Projected total</Text><Text style={[s.summaryVal, s.summaryStrong]}>{formatMoney(projectedValue, currency)}</Text></View>
          </View>
        </SurfaceCard>

        <SurfaceCard style={s.compactCard}>
          <SliderRow
            label="Saved from spending"
            value={savedPercent}
            min={10}
            max={50}
            suffix="%"
            onChange={(v) => {
              setSavedPercent(v);
              void hapticSelection();
            }}
          />
          <View style={{ height: 10 }} />
          <SliderRow
            label="Time horizon"
            value={years}
            min={1}
            max={30}
            suffix="y"
            onChange={(v) => {
              void hapticSelection();
              setYears(v);
            }}
          />

          <View style={s.segment}>
            <Pressable
              onPress={() => {
                void hapticSelection();
                setScenario('conservative');
              }}
              style={[s.segmentBtn, scenario === 'conservative' && s.segmentBtnActive]}
            >
              <Text style={[s.segmentText, scenario === 'conservative' && s.segmentTextActive]}>Conservative 6%</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void hapticSelection();
                setScenario('average');
              }}
              style={[s.segmentBtn, scenario === 'average' && s.segmentBtnActive]}
            >
              <Text style={[s.segmentText, scenario === 'average' && s.segmentTextActive]}>Average 8%</Text>
            </Pressable>
          </View>
        </SurfaceCard>

        <SurfaceCard style={s.actionsCard}>
          <View style={s.optimizeRow}>
            <View style={{ flex: 1 }}>
              <Text style={s.optimizeTitle}>Cancel 2 subscriptions and invest the difference</Text>
              <Text style={s.optimizeSub}>You could free up {formatMoney(optimizeMonthlySaved, currency)}/month.</Text>
            </View>
            <Pressable
              onPress={() => {
                void hapticSelection();
                navigation.navigate('Subscriptions');
              }}
              style={({ pressed }) => [s.reviewBtn, pressed && s.pressed]}
            >
              <Text style={s.reviewText}>Review</Text>
            </Pressable>
          </View>

          <View style={s.linkList}>
            <Pressable
              onPress={() => {
                void hapticSelection();
                Linking.openURL(AFFILIATE_ROBINHOOD);
              }}
              style={({ pressed }) => [s.linkRow, pressed && s.pressed]}
            >
              <Text style={s.linkName}>Robinhood</Text>
              <SFIcon name="arrow.up.right.square" size={16} color={INK} />
            </Pressable>
            <Pressable
              onPress={() => {
                void hapticSelection();
                Linking.openURL(AFFILIATE_WEBULL);
              }}
              style={({ pressed }) => [s.linkRow, pressed && s.pressed]}
            >
              <Text style={s.linkName}>Webull</Text>
              <SFIcon name="arrow.up.right.square" size={16} color={INK} />
            </Pressable>
          </View>

          <Text style={s.affiliate}>Affiliate links. We may earn a commission.</Text>
          <Text style={s.disclaimer}>Estimates are based on historical averages and are not financial advice.</Text>
        </SurfaceCard>
      </ScrollView>
    </TabScreenBackground>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: spacing.screenX, paddingBottom: 40, gap: 10 },
  pressed: { opacity: 0.75 },

  mainCard: { backgroundColor: CARD, borderRadius: radius.card, padding: spacing.cardPadding, gap: 8 },
  kicker: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '700', color: DIM },
  spendLine: { fontSize: 17, color: INK, fontWeight: '700', lineHeight: 23 },
  spendSub: { fontSize: 13, color: DIM, fontWeight: '500' },
  hint: { fontSize: 12, color: DIM, fontWeight: '500' },

  heroBlock: { marginTop: 4, marginBottom: 4 },
  heroIntro: { fontSize: 14, color: INK, fontWeight: '700' },
  heroSmall: { fontSize: 13, color: DIM, fontWeight: '600', marginTop: 1 },
  heroValue: { fontSize: 40, fontWeight: '800', color: INK, letterSpacing: -0.9, marginTop: 2 },
  heroFoot: { fontSize: 12, color: DIM, fontWeight: '600', marginTop: 1 },

  chartWrap: {
    borderRadius: 12,
    backgroundColor: '#F8F8FF',
    borderWidth: 1,
    borderColor: 'rgba(109,98,255,0.15)',
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 2,
  },

  summaryRows: { marginTop: 4, gap: 2 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: SEP,
  },
  summaryKey: { fontSize: 13, color: DIM, fontWeight: '500' },
  summaryVal: { fontSize: 14, color: INK, fontWeight: '700' },
  summaryStrong: { color: GREEN, fontWeight: '800' },

  compactCard: { backgroundColor: CARD, borderRadius: radius.card, padding: 14, gap: 8 },
  sliderHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderLabel: { fontSize: 13, color: DIM, fontWeight: '600' },
  sliderValue: { fontSize: 13, color: INK, fontWeight: '800' },
  sliderTrackBox: { width: 260, height: 24, justifyContent: 'center' },
  sliderTrack: { position: 'absolute', width: 260, height: 5, borderRadius: 3, backgroundColor: 'rgba(11,8,3,0.1)' },
  sliderFill: { position: 'absolute', height: 5, borderRadius: 3, backgroundColor: ACCENT },
  sliderThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ACCENT,
    borderWidth: 2,
    borderColor: '#fff',
  },

  segment: { flexDirection: 'row', backgroundColor: BG, borderRadius: 12, padding: 3, gap: 4, marginTop: 2 },
  segmentBtn: { flex: 1, borderRadius: 9, paddingVertical: 7, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: INK },
  segmentText: { fontSize: 12, fontWeight: '700', color: DIM },
  segmentTextActive: { color: '#fff' },

  actionsCard: { backgroundColor: CARD, borderRadius: radius.card, padding: 14, gap: 10 },
  optimizeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  optimizeTitle: { fontSize: 14, fontWeight: '700', color: INK, lineHeight: 19 },
  optimizeSub: { fontSize: 12, color: DIM, fontWeight: '500', marginTop: 1 },
  reviewBtn: {
    backgroundColor: INK,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  reviewText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  linkList: {
    borderTopWidth: 1,
    borderTopColor: SEP,
    paddingTop: 6,
    gap: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  linkName: { fontSize: 14, fontWeight: '700', color: INK },

  affiliate: { fontSize: 11, color: DIM },
  disclaimer: { fontSize: 11, color: DIM },
});
