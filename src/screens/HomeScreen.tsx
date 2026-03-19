import React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFonts, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { CompanyLogo } from '../components/CompanyLogo';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { RootTabsParamList } from '../../App';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { activeSubscriptionsCount, formatMoney, monthlySpendTotal, topSubscriptionsByPrice } from '../features/subscriptions/calc';
import { useSubscriptionsStore } from '../features/subscriptions/store';

type Props = BottomTabScreenProps<RootTabsParamList, 'Home'>;

const FONTS = { BricolageGrotesque_800ExtraBold };

type BudgetRow = {
  id: string;
  name: string;
  spent: number;
  total: number;
  dotColor: string;
  fillColor: string;
};

const budgetRows: BudgetRow[] = [
  { id: 'g', name: 'Groceries', spent: 320, total: 500, dotColor: '#EFE4F8', fillColor: '#A646FA' },
  { id: 'd', name: 'Dining', spent: 210, total: 500, dotColor: '#F4ECE8', fillColor: '#DB7248' },
  { id: 's', name: 'Shopping', spent: 430, total: 400, dotColor: '#DFF0EA', fillColor: '#B1060F' },
];

export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const [fontsLoaded] = useFonts(FONTS);
  const tabBarSpace = 62 + Math.max(10, insets.bottom) + 22;
  const heroTopPadding = insets.top + 14;
  const bgSource = require('../../background.png');
  const bgResolved = Image.resolveAssetSource(bgSource);
  const bgScale = bgResolved?.width && bgResolved?.height ? bgResolved.height / bgResolved.width : 0.81;
  const bgHeight = Math.round(screenWidth * bgScale);

  const subs = useSubscriptionsStore((s) => s.items);
  const currency = subs[0]?.currency ?? 'USD';
  const subsMonthly = monthlySpendTotal(subs);
  const subsCount = activeSubscriptionsCount(subs);
  const top3 = topSubscriptionsByPrice(subs, 3);

  if (!fontsLoaded) return null;

  return (
    <View style={styles.safe}>
      <View pointerEvents="none" style={styles.topIllustration}>
        <Image
          source={bgSource}
          style={{ width: screenWidth, height: bgHeight }}
          resizeMode="cover"
        />
      </View>

      {/* Keep illustration flush to the very top; apply safe-area only to content */}
      <SafeAreaView style={styles.contentSafe} edges={['left', 'right', 'bottom']}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: tabBarSpace }]}
          showsVerticalScrollIndicator={false}
        >
          <HeroSection
            topPadding={heroTopPadding}
            onPressAdd={() => {}}
            onPressEditBudget={() => navigation.navigate('Budget')}
          />

        <Pressable onPress={() => navigation.navigate('Budget')} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
          <Text style={styles.cardTitle}>April Remaining Budget</Text>
          <View style={styles.amountRow}>
            <Text style={styles.cardAmount}>$420.00</Text>
            <Text style={styles.amountSub}>/ $1400.00</Text>
          </View>

          <View style={{ marginTop: 12 }}>
            {budgetRows.map((row) => (
              <BudgetProgressRow key={row.id} row={row} onPress={() => navigation.navigate('Budget')} />
            ))}
          </View>
          <Text style={styles.cardFoot}>Running a little high</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('Subscriptions')}
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <Text style={styles.cardTitle}>Subscriptions</Text>
          <View style={styles.amountRow}>
            <Text style={styles.cardAmount}>{formatMoney(subsMonthly, currency)}</Text>
            <Text style={styles.amountSub}>/ month</Text>
          </View>
          <Text style={styles.cardFoot}>{subsCount} active</Text>

          {top3.length > 0 ? (
            <View style={styles.logoStack} pointerEvents="none">
              {top3.map((s, idx) => (
                <LogoBubble key={s.id} overlap={idx !== 0}>
                  {s.domain ? (
                    <CompanyLogo domain={s.domain} size={30} rounded={8} fallbackText={s.serviceName} />
                  ) : (
                    <View style={styles.logoFallback}>
                      <Text style={styles.logoFallbackText}>{(s.serviceName.trim()[0] ?? '?').toUpperCase()}</Text>
                    </View>
                  )}
                </LogoBubble>
              ))}
            </View>
          ) : null}
        </Pressable>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function HeroSection({
  topPadding,
  onPressAdd,
  onPressEditBudget,
}: {
  topPadding: number;
  onPressAdd: () => void;
  onPressEditBudget: () => void;
}) {
  return (
    <View style={[styles.hero, { paddingTop: topPadding }]}>
      <Text style={styles.label}>Available to Spend</Text>
      <Text style={styles.heroAmount}>$1,525.00</Text>
      <Text style={styles.delta}>+$320 vs last month</Text>

      <View style={styles.ctaRow}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onPressAdd();
          }}
          style={({ pressed }) => [styles.primaryCta, pressed && styles.pressed]}
        >
          <Text style={styles.primaryText}>Add Transaction</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync();
            onPressEditBudget();
          }}
          style={({ pressed }) => [styles.secondaryCta, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>Edit Budget</Text>
        </Pressable>
      </View>
    </View>
  );
}

function BudgetProgressRow({ row, onPress }: { row: BudgetRow; onPress: () => void }) {
  const ratio = Math.max(0, Math.min(1, row.spent / row.total));
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.budgetRow, pressed && { opacity: 0.85 }]}>
      <View style={[styles.dot, { backgroundColor: row.dotColor }]} />
      <View style={{ flex: 1 }}>
        <View style={styles.budgetTop}>
          <Text style={styles.budgetName}>{row.name}</Text>
          <Text style={styles.budgetValue}>
            ${row.spent} <Text style={styles.budgetTotal}>/ {row.total}</Text>
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: row.fillColor }]} />
        </View>
      </View>
    </Pressable>
  );
}

function LogoBubble({ children, overlap }: { children: React.ReactNode; overlap?: boolean }) {
  return <View style={[styles.logoBubble, overlap && { marginLeft: -14 }]}>{children}</View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  // Background illustration: visible, non-interactive, behind content.
  topIllustration: { position: 'absolute', top: 0, left: 0 },
  contentSafe: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingHorizontal: 16, paddingTop: 0 },
  pressed: { opacity: 0.84 },

  hero: { paddingHorizontal: 16, paddingBottom: 16, minHeight: 274 },
  label: { fontFamily: 'SF Pro Display', fontSize: 17, fontWeight: '600', color: '#000000', marginTop: 8 },
  heroAmount: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 56, color: '#0B0803', marginTop: 10, lineHeight: 58 },
  delta: { fontFamily: 'SF Pro Display', fontSize: 14, fontWeight: '500', color: '#616161', marginTop: 6 },
  ctaRow: { marginTop: 34, flexDirection: 'row', gap: 8 },
  primaryCta: { width: 157, height: 48, borderRadius: 999, backgroundColor: '#30CE5A', alignItems: 'center', justifyContent: 'center' },
  secondaryCta: { width: 157, height: 48, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.65)', alignItems: 'center', justifyContent: 'center' },
  primaryText: { fontFamily: 'SF Pro Display', fontSize: 17, fontWeight: '400', color: '#FFFFFF' },
  secondaryText: { fontFamily: 'SF Pro Display', fontSize: 17, fontWeight: '500', color: '#1A1A1A' },

  card: { backgroundColor: '#FFFFFF', borderRadius: 22, paddingHorizontal: 18, paddingTop: 16, paddingBottom: 14, marginTop: 16 },
  cardTitle: { fontFamily: 'SF Pro Display', fontSize: 17, fontWeight: '600', color: '#000000' },
  amountRow: { marginTop: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  cardAmount: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 32, lineHeight: 32, color: '#000000' },
  amountSub: { fontFamily: 'SF Pro Display', fontSize: 12, fontWeight: '500', color: '#616161' },
  cardFoot: { fontFamily: 'SF Pro Display', fontSize: 12, fontWeight: '500', color: '#616161', marginTop: 2 },

  budgetRow: { flexDirection: 'row', gap: 12, marginTop: 12, alignItems: 'center' },
  dot: { width: 48, height: 48, borderRadius: 24 },
  budgetTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetName: { fontFamily: 'SF Pro Display', fontSize: 15, fontWeight: '600', color: '#171717' },
  budgetValue: { fontFamily: 'SF Pro Display', fontSize: 15, fontWeight: '600', color: '#171717' },
  budgetTotal: { fontFamily: 'SF Pro Display', fontWeight: '500', color: '#616161' },
  track: { marginTop: 10, height: 6, borderRadius: 20, backgroundColor: '#D9D9D9', overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 20 },

  logoStack: { position: 'absolute', right: 20, top: 42, flexDirection: 'row', alignItems: 'center' },
  logoBubble: { width: 56, height: 56, borderRadius: 28, borderWidth: 1, borderColor: '#E8E8E8', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  logoFallback: { width: 30, height: 30, borderRadius: 8, backgroundColor: 'rgba(11, 8, 3, 0.06)', alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { fontSize: 14, fontWeight: '900', color: 'rgba(11, 8, 3, 0.72)' },
});

