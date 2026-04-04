import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image as RNImage,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SFIcon } from '../components/SFIcon';
import { formatMoney, monthlySpendTotal } from '../features/subscriptions/calc';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { hapticImpactHeavy, hapticImpactMedium, hapticSelection } from '../ui/haptics';
import { figma, radius, spacing } from '../ui/theme';

const ANNUAL_RETURN = 0.07;
const MONTHS = 120;
/** No subscriptions: slider 0…max; midpoint = 50% → e.g. $120/m when max is $240 (matches screenshot). */
const DEMO_MAX_MONTHLY = 240;

const WEBULL_URL = 'https://www.webull.com/open-account';
const ROBINHOOD_URL = 'https://robinhood.com/signup';

/** Bundled partner marks (logo.dev snapshot) — ship in repo for offline / reliable builds */
const PARTNER_LOGO_WEBULL = require('../assets/partners/webull.png');
const PARTNER_LOGO_ROBINHOOD = require('../assets/partners/robinhood.png');

/** Hoisted `require` so Metro always registers this asset in production/release bundles */
const INVEST_SLIDER_STRIPES = require('../assets/invest-slider-stripes.png');

const TRACK_GREY = 'rgba(0, 0, 0, 0.10)';
const THUMB_SIZE = 32;
const TRACK_HEIGHT = 12;
/** Tappable row height; idle thumb is THUMB_SIZE, grows to this while dragging. */
const SLIDER_TOUCH_HEIGHT = 40;
/** One haptic tick per step across 0…1 (50 discrete steps). */
const SLIDER_HAPTIC_STEPS = 50;
/** Intrinsic size of `invest-slider-stripes.png` (width × height). */
const STRIPE_PNG_W = 765;
const STRIPE_PNG_H = 20;

function futureValueMonthly(monthly: number, annualRate: number, months: number): number {
  if (monthly <= 0) return 0;
  const i = annualRate / 12;
  if (i < 1e-12) return monthly * months;
  return monthly * ((Math.pow(1 + i, months) - 1) / i);
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}

/** Stripe texture from asset; height fixed at track, width follows PNG aspect ratio; tiles repeat if fill is wider. */
function SliderStripeOverlay({ width }: { width: number }) {
  const tileW = TRACK_HEIGHT * (STRIPE_PNG_W / STRIPE_PNG_H);
  const tileCount = Math.max(1, Math.ceil(width / tileW));
  return (
    <View style={[sliderStyles.fillStripeOverlay, { width }]} pointerEvents="none">
      <View style={sliderStyles.stripeTileRow}>
        {Array.from({ length: tileCount }, (_, i) => (
          <RNImage
            key={i}
            source={INVEST_SLIDER_STRIPES}
            style={{ width: tileW, height: TRACK_HEIGHT }}
            resizeMode="cover"
          />
        ))}
      </View>
    </View>
  );
}

function InvestSlider({
  value,
  onChange,
  trackWidth,
  onInteractionStart,
  onInteractionEnd,
}: {
  value: number;
  onChange: (v: number) => void;
  trackWidth: number;
  onInteractionStart?: () => void;
  onInteractionEnd?: () => void;
}) {
  const grantValue = useRef(value);
  const grantPageX = useRef(0);
  const valueRef = useRef(value);
  const lastHapticStepRef = useRef(0);
  /** Thumb + fill read this so they move on the same frame as the gesture (no parent round-trip). */
  const [dragging, setDragging] = useState(false);
  const [liveNorm, setLiveNorm] = useState(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    if (!dragging) setLiveNorm(value);
  }, [value, dragging]);

  const valueFromPageX = useCallback(
    (pageX: number, startPageX: number, startVal: number) => {
      if (trackWidth <= TRACK_HEIGHT) return startVal;
      const deltaPx = pageX - startPageX;
      const deltaNorm = deltaPx / (trackWidth - TRACK_HEIGHT);
      return clamp01(startVal + deltaNorm);
    },
    [trackWidth]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          onInteractionStart?.();
          grantPageX.current = e.nativeEvent.pageX;
          grantValue.current = valueRef.current;
          const v0 = valueRef.current;
          setDragging(true);
          setLiveNorm(v0);
          lastHapticStepRef.current = Math.min(
            SLIDER_HAPTIC_STEPS - 1,
            Math.max(0, Math.floor(v0 * SLIDER_HAPTIC_STEPS))
          );
          void hapticImpactHeavy();
        },
        onPanResponderMove: (e) => {
          const next = valueFromPageX(e.nativeEvent.pageX, grantPageX.current, grantValue.current);
          setLiveNorm(next);
          onChange(next);

          const step = Math.min(
            SLIDER_HAPTIC_STEPS - 1,
            Math.max(0, Math.floor(next * SLIDER_HAPTIC_STEPS))
          );
          if (step !== lastHapticStepRef.current) {
            lastHapticStepRef.current = step;
            void hapticImpactMedium();
          }
        },
        onPanResponderRelease: () => {
          setDragging(false);
          onInteractionEnd?.();
          void hapticImpactHeavy();
        },
        onPanResponderTerminate: () => {
          setDragging(false);
          onInteractionEnd?.();
        },
      }),
    [onChange, onInteractionEnd, onInteractionStart, valueFromPageX]
  );

  const fillW = trackWidth > 0 ? clamp01(liveNorm) * trackWidth : 0;
  const thumbSize = dragging ? SLIDER_TOUCH_HEIGHT : THUMB_SIZE;
  const thumbOverhang = (thumbSize - TRACK_HEIGHT) / 2;
  const thumbTop = (SLIDER_TOUCH_HEIGHT - thumbSize) / 2;
  const thumbLeft =
    trackWidth > TRACK_HEIGHT
      ? -thumbOverhang + clamp01(liveNorm) * (trackWidth - TRACK_HEIGHT)
      : -thumbOverhang;

  function onTrackPress(locationX: number) {
    if (trackWidth <= 0) return;
    const v = clamp01(locationX / trackWidth);
    setLiveNorm(v);
    onChange(v);
    void hapticImpactHeavy();
  }

  return (
    <View style={sliderStyles.wrap}>
      <View style={sliderStyles.trackSlot}>
        <Pressable
          style={[sliderStyles.trackPress, { width: trackWidth }]}
          onPress={(e) => onTrackPress(e.nativeEvent.locationX)}
        >
          <View style={sliderStyles.trackRailInner}>
            <View style={StyleSheet.absoluteFillObject}>
              <View style={sliderStyles.trackBg} />
              {fillW > 0.5 ? (
                <View style={[sliderStyles.fillClip, { width: fillW }]} pointerEvents="none">
                  <LinearGradient
                    colors={['#D53AEA', '#CB30E0']}
                    start={{ x: 0.5, y: 0 }}
                    end={{ x: 0.5, y: 1 }}
                    style={sliderStyles.fillGradient}
                  />
                  <SliderStripeOverlay width={fillW} />
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </View>
      <View
        style={[
          sliderStyles.thumbOuter,
          {
            left: thumbLeft,
            top: thumbTop,
            width: thumbSize,
            height: thumbSize,
            borderRadius: thumbSize / 2,
            padding: Math.round((5 * thumbSize) / THUMB_SIZE),
          },
        ]}
        {...panResponder.panHandlers}
      >
        <LinearGradient
          colors={['#D53AEA', '#DF44F4', '#B71CCC']}
          locations={[0.021, 0.3703, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={[
            sliderStyles.thumbMiddle,
            {
              borderRadius: Math.round(thumbSize * 0.9375),
              padding: Math.round((6 * thumbSize) / THUMB_SIZE),
            },
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#FFBBFF']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              sliderStyles.thumbInner,
              {
                width: Math.round((10 * thumbSize) / THUMB_SIZE),
                height: Math.round((10 * thumbSize) / THUMB_SIZE),
              },
            ]}
          />
        </LinearGradient>
      </View>
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  wrap: {
    marginTop: 0,
    height: SLIDER_TOUCH_HEIGHT,
    position: 'relative',
    justifyContent: 'center',
  },
  trackSlot: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
  },
  trackPress: {
    height: SLIDER_TOUCH_HEIGHT,
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  trackRailInner: {
    height: TRACK_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  trackBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TRACK_GREY,
    borderRadius: 20,
  },
  fillClip: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: TRACK_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
  },
  fillGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  fillStripeOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: TRACK_HEIGHT,
    overflow: 'hidden',
  },
  stripeTileRow: {
    flexDirection: 'row',
    height: TRACK_HEIGHT,
  },
  thumbOuter: {
    position: 'absolute',
    backgroundColor: 'rgba(203, 48, 224, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  thumbMiddle: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3F0054',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  thumbInner: {
    borderRadius: 999,
  },
});

function InfoFootnote() {
  const icon =
    Platform.OS === 'ios' ? (
      <SFIcon name="info.circle.fill" size={14} color="#616161" weight="regular" />
    ) : (
      <Ionicons name="information-circle-outline" size={15} color="#616161" />
    );
  return (
    <View style={styles.disclosureRow}>
      {icon}
      <Text style={styles.disclosureText}>Based on average market returns (~7% annually)</Text>
    </View>
  );
}

function PartnerBrandLogo({ source }: { source: React.ComponentProps<typeof RNImage>['source'] }) {
  return <RNImage source={source} style={styles.partnerBrandImage} resizeMode="contain" />;
}

function PartnerRow({
  logo,
  name,
  subtitle,
  url,
  isFirst = false,
}: {
  logo: React.ReactNode;
  name: string;
  subtitle: string;
  url: string;
  isFirst?: boolean;
}) {
  const open = useCallback(() => {
    void hapticSelection();
    void Linking.openURL(url);
  }, [url]);

  return (
    <View style={[styles.partnerCard, isFirst && styles.partnerCardFirst]}>
      <View style={styles.partnerInner}>
        <View style={styles.partnerLogoWrap}>{logo}</View>
        <View style={styles.partnerMain}>
          <View style={styles.partnerCopy}>
            <Text style={styles.partnerName}>{name}</Text>
            <Text style={styles.partnerSubtitle}>{subtitle}</Text>
          </View>
          <Pressable onPress={open} style={({ pressed }) => [styles.openAccount, pressed && styles.pressed]}>
            <Text style={styles.openAccountText}>Open Account</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function OurPartners() {
  return (
    <View style={styles.partnersSectionDebug}>
      <Text style={styles.partnersHeading}>Our Partners</Text>

      <PartnerRow
        name="Webull"
        subtitle="Advanced tools. Zero commission."
        url={WEBULL_URL}
        isFirst
        logo={<PartnerBrandLogo source={PARTNER_LOGO_WEBULL} />}
      />

      <PartnerRow
        name="Robinhood"
        subtitle="Simple way to start investing."
        url={ROBINHOOD_URL}
        logo={<PartnerBrandLogo source={PARTNER_LOGO_ROBINHOOD} />}
      />
    </View>
  );
}

function InvestHeroValue({ valueText }: { valueText: string }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.label}>Est. value in 10 years</Text>
      <Text style={styles.heroAmount}>{valueText}</Text>
    </View>
  );
}

export function InvestScreen() {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const subs = useSubscriptionsStore((s) => s.items);
  const currency = subs[0]?.currency ?? 'USD';
  const subsMonthly = monthlySpendTotal(subs);

  const maxMonthly = subsMonthly > 0 ? subsMonthly : DEMO_MAX_MONTHLY;
  const [sliderNorm, setSliderNorm] = useState(0.5);
  const [trackWidth, setTrackWidth] = useState(0);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const subsMonthlyKey = Math.round(subsMonthly * 100) / 100;
  useEffect(() => {
    setSliderNorm(0.5);
  }, [subsMonthlyKey, subs.length]);

  const monthlyInvest = useMemo(
    () => Math.max(0, Math.round(sliderNorm * maxMonthly)),
    [sliderNorm, maxMonthly]
  );

  const projected = useMemo(
    () => Math.round(futureValueMonthly(monthlyInvest, ANNUAL_RETURN, MONTHS)),
    [monthlyInvest]
  );

  return (
    <ScrollView
      style={styles.scroll}
      scrollEnabled={scrollEnabled}
      contentContainerStyle={[
        styles.content,
        {
          minHeight: Platform.OS === 'ios' ? windowHeight + 1 : windowHeight,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
      alwaysBounceVertical
      bounces
    >
      <InvestHeroValue valueText={formatMoney(projected, currency as any)} />

      <View style={styles.calculatorSection}>
        <View style={styles.monthlyInputGroup}>
          <View style={styles.monthlyRow}>
            <Text style={styles.monthlyLabel}>Monthly investment</Text>
            <View style={styles.amountPill}>
              <Text style={styles.amountPillText}>
                {formatMoney(monthlyInvest, currency as any)}/m
              </Text>
            </View>
          </View>
        </View>

        <View
          onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)}
          style={styles.sliderTrackHost}
        >
          {trackWidth > 0 ? (
            <InvestSlider
              value={sliderNorm}
              onChange={setSliderNorm}
              trackWidth={trackWidth}
              onInteractionStart={() => setScrollEnabled(false)}
              onInteractionEnd={() => setScrollEnabled(true)}
            />
          ) : (
            <View style={{ height: SLIDER_TOUCH_HEIGHT }} />
          )}
        </View>

        <InfoFootnote />
      </View>

      <OurPartners />

      <Text style={styles.riskFoot}>
        Not financial advice. Investing involves risk.{'\n'}
        We may earn a referral fee
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  /** Keep Home card rhythm, but match Subscriptions vertical start. */
  content: { paddingHorizontal: spacing.screenX, paddingTop: 4 },

  /** Match Subscriptions `spendingBlock` position exactly. */
  hero: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    paddingHorizontal: figma.subscriptions273.textColumnGutterX,
    marginTop:
      figma.subscriptions273.titleToSpendingGroupGap -
      figma.subscriptions273.spendingGroupPredecessorStack,
    marginBottom: 0,
  },
  /** Match Subscriptions `spendingContext` ("Spending in April"). */
  label: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 19,
    marginBottom: figma.subscriptions273.spendingGroupRowGap,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  /** Match Subscriptions `spendingHeroAmount` scale/metrics. */
  heroAmount: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: figma.heroNumber.fontSize,
    color: '#0B0803',
    lineHeight: figma.heroNumber.lineHeight,
    letterSpacing: figma.heroNumber.letterSpacing,
    textAlign: 'left',
    alignSelf: 'stretch',
  },

  /** HomeScreen `card` */
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 14,
    marginTop: 16,
  },
  /** Partner cards use same card shell, but no extra internal card padding. */
  partnerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    marginTop: 12,
    overflow: 'hidden',
  },
  partnerCardFirst: {
    marginTop: 0,
  },
  /** Calculator section (plain text/controls), aligned to Est value text column. */
  calculatorSection: {
    paddingHorizontal: figma.subscriptions273.textColumnGutterX,
    paddingTop: 0,
    paddingBottom: 0,
    marginTop: 32,
    marginBottom: 32,
    marginHorizontal: 0,
  },
  pressed: { opacity: 0.84 },

  monthlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  monthlyInputGroup: {
    marginBottom: 4,
  },
  monthlyLabel: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    fontWeight: '600',
    color: '#616161',
    flex: 1,
  },
  amountPill: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.60)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 12,
    padding: 10,
  },
  amountPillText: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 16,
    textAlign: 'center',
    color: '#000000',
  },

  sliderTrackHost: {
    alignSelf: 'stretch',
    marginBottom: 6,
  },

  disclosureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disclosureText: {
    flex: 1,
    fontFamily: 'SF Pro Display',
    fontSize: 11,
    fontWeight: '500',
    color: '#616161',
  },

  partnersHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#616161',
    paddingHorizontal: 20,
    marginTop: 0,
    marginBottom: spacing.sectionTitleToCard,
  },
  partnersSectionDebug: {},

  partnerInner: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingLeft: 20,
    paddingRight: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  partnerLogoWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    alignSelf: 'center',
    flexShrink: 0,
  },
  partnerBrandImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  partnerMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  partnerCopy: {
    flex: 1,
    minWidth: 0,
  },
  partnerName: {
    fontFamily: 'SF Pro Display',
    fontSize: 16,
    fontWeight: '600',
    color: '#171717',
  },
  partnerSubtitle: {
    fontFamily: 'SF Pro Display',
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
    marginTop: 4,
    lineHeight: 17,
  },
  openAccount: {
    backgroundColor: '#0B0803',
    minHeight: 40,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    alignSelf: 'center',
  },
  openAccountText: {
    fontFamily: 'SF Pro Display',
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  riskFoot: {
    fontFamily: 'SF Pro Display',
    fontSize: 11,
    fontWeight: '500',
    color: '#616161',
    lineHeight: 14,
    textAlign: 'left',
    marginTop: 16,
    paddingHorizontal: 20,
  },
});
