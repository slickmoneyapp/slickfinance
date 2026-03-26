import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DatePickerModal } from '../components/DatePickerModal';
import { TimePickerModal } from '../components/TimePickerModal';
import { CompanyLogo } from '../components/CompanyLogo';
import { hapticSelection } from '../ui/haptics';
import { colors, radius, spacing } from '../ui/theme';
import { AppButton, AppScreen, IconCircleButton, ScreenHeader } from '../ui/components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSubscriptionPrototype'>;

type BillingCycle = 'monthly' | 'yearly' | 'weekly' | 'custom';
type CurrencyCode = 'USD' | 'EUR' | 'GEL';
type PaymentMethod = 'Card' | 'PayPal' | 'Apple Pay' | 'Other' | '';

type MockService = {
  name: string;
  domain: string;
  category: string;
};

type WizardState = {
  serviceName: string;
  logo: string;
  category: string;
  price: string;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  nextChargeDate: Date;
  hasTrial: boolean;
  trialEndDate: Date;
  reminderDaysBefore: number;
  reminderTime: string;
  paymentMethod: PaymentMethod;
};

const INK = colors.text;
const DIM = colors.textMuted;
const CARD = colors.surface;
const GREEN = colors.success;
const BG = colors.bg;

const SERVICES: MockService[] = [
  { name: 'Netflix', domain: 'netflix.com', category: 'Entertainment' },
  { name: 'Spotify', domain: 'spotify.com', category: 'Music' },
  { name: 'ChatGPT', domain: 'openai.com', category: 'AI Tools' },
  { name: 'Adobe', domain: 'adobe.com', category: 'Productivity' },
  { name: 'Apple Music', domain: 'music.apple.com', category: 'Music' },
  { name: 'YouTube Premium', domain: 'youtube.com', category: 'Entertainment' },
];

const PAYMENT_METHODS: PaymentMethod[] = ['Card', 'PayPal', 'Apple Pay', 'Other'];

const STEPS_TOTAL = 5;
type Step = 0 | 1 | 2 | 3 | 4 | 5;

function plusDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function cycleLabel(cycle: BillingCycle) {
  if (cycle === 'monthly') return 'month';
  if (cycle === 'yearly') return 'year';
  if (cycle === 'weekly') return 'week';
  return 'custom';
}

function formatDate(d: Date) {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatMoney(raw: string, currency: CurrencyCode) {
  const value = Number(raw.replace(',', '.'));
  if (!Number.isFinite(value) || value <= 0) return currency === 'USD' ? '$0' : currency === 'EUR' ? 'EUR 0' : 'GEL 0';
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? 'EUR ' : 'GEL ';
  return `${symbol}${value.toFixed(2).replace(/\.00$/, '')}`;
}

export function AddSubscriptionPrototypeScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>(0);
  const [serviceSearch, setServiceSearch] = useState('');
  const [showNextChargePicker, setShowNextChargePicker] = useState(false);
  const [showTrialEndPicker, setShowTrialEndPicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

  const [state, setState] = useState<WizardState>({
    serviceName: '',
    logo: '',
    category: 'Utilities',
    price: '',
    currency: 'USD',
    billingCycle: 'monthly',
    nextChargeDate: plusDays(30),
    hasTrial: false,
    trialEndDate: plusDays(10),
    reminderDaysBefore: 1,
    reminderTime: '09:00',
    paymentMethod: '',
  });

  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return SERVICES;
    return SERVICES.filter((s) => s.name.toLowerCase().includes(q));
  }, [serviceSearch]);

  const priceNumber = Number(state.price.replace(',', '.'));
  const yearlyEstimate = useMemo(() => {
    if (!Number.isFinite(priceNumber) || priceNumber <= 0) return 0;
    if (state.billingCycle === 'monthly') return priceNumber * 12;
    if (state.billingCycle === 'weekly') return priceNumber * 52;
    if (state.billingCycle === 'yearly') return priceNumber;
    return priceNumber * 12;
  }, [priceNumber, state.billingCycle]);

  function animateToStep(next: Step) {
    if (next === step) return;
    const dir = next > step ? 1 : -1;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 120, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -18 * dir, duration: 120, useNativeDriver: true }),
    ]).start(() => {
      setStep(next);
      translateX.setValue(18 * dir);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  }

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function onBack() {
    if (step === 0) {
      navigation.goBack();
      return;
    }
    animateToStep((step - 1) as Step);
  }

  function onNext() {
    if (step === 1) {
      const n = Number(state.price.replace(',', '.'));
      if (!Number.isFinite(n) || n <= 0) return;
    }
    if (step < 5) animateToStep((step + 1) as Step);
  }

  function selectService(service: MockService) {
    void hapticSelection();
    setState((prev) => ({
      ...prev,
      serviceName: service.name,
      logo: service.domain,
      category: service.category,
    }));
    animateToStep(1);
  }

  function savePrototype() {
    Alert.alert('Prototype', 'Subscription saved in prototype mode only.');
    navigation.goBack();
  }

  const previewLine = `${formatMoney(state.price, state.currency)} / ${cycleLabel(state.billingCycle)}`;
  const reminderDate = new Date(state.nextChargeDate);
  reminderDate.setDate(reminderDate.getDate() - state.reminderDaysBefore);

  const canContinue = step !== 1 || (Number.isFinite(priceNumber) && priceNumber > 0);

  return (
    <AppScreen edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Add Subscription"
        left={<IconCircleButton icon="chevron-back" onPress={onBack} />}
        right={step === 5 ? <AppButton label="Save" onPress={savePrototype} /> : undefined}
      />

      <View style={s.progressWrap}>
        {step < 5 ? (
          <>
            <Text style={s.progressText}>Step {step + 1} of {STEPS_TOTAL}</Text>
            <View style={s.dotRow}>
              {[0, 1, 2, 3, 4].map((n) => (
                <View key={n} style={[s.dot, n <= step && s.dotActive]} />
              ))}
            </View>
          </>
        ) : (
          <Text style={s.progressText}>Review</Text>
        )}
      </View>

      <Animated.View style={[s.stepWrap, { opacity, transform: [{ translateX }] }]}>
        {step === 0 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>What are you subscribing to?</Text>
            <View style={s.searchShell}>
              <Ionicons name="search" size={18} color={DIM} />
              <TextInput
                value={serviceSearch}
                onChangeText={setServiceSearch}
                placeholder="Search services"
                placeholderTextColor={DIM}
                style={s.searchInput}
                autoFocus
              />
            </View>
            <ScrollView style={s.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filteredServices.map((service) => (
                <Pressable key={service.name} onPress={() => selectService(service)} style={({ pressed }) => [s.serviceRow, pressed && s.pressed]}>
                  <CompanyLogo domain={service.domain} size={42} rounded={12} fallbackText={service.name} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.serviceName}>{service.name}</Text>
                    <Text style={s.serviceMeta}>{service.category}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={DIM} />
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {step === 1 && (
          <ScrollView style={s.stepContent} contentContainerStyle={s.stepScrollInner} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={s.previewCard}>
              <View style={s.previewTop}>
                {state.logo ? (
                  <CompanyLogo domain={state.logo} size={44} rounded={12} fallbackText={state.serviceName || '?'} />
                ) : (
                  <View style={s.logoFallback}><Text style={s.logoFallbackText}>{(state.serviceName[0] ?? '?').toUpperCase()}</Text></View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={s.previewName}>{state.serviceName || 'Subscription'}</Text>
                  <Text style={s.previewLine}>{previewLine}</Text>
                  <Text style={s.previewMeta}>Next charge: {formatDate(state.nextChargeDate)}</Text>
                </View>
              </View>
              <Text style={s.previewMeta}>
                {formatMoney(String(yearlyEstimate), state.currency)} per year
              </Text>
            </View>

            <Text style={s.label}>Price</Text>
            <View style={s.priceRow}>
              <TextInput
                value={state.price}
                onChangeText={(t) => update('price', t)}
                style={s.priceInput}
                placeholder="0.00"
                placeholderTextColor={DIM}
                keyboardType="decimal-pad"
                autoFocus
              />
              <View style={s.currencyWrap}>
                {(['USD', 'EUR', 'GEL'] as CurrencyCode[]).map((c) => (
                  <Pressable key={c} onPress={() => update('currency', c)} style={[s.currencyPill, state.currency === c && s.currencyPillActive]}>
                    <Text style={[s.currencyText, state.currency === c && s.currencyTextActive]}>{c}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={s.label}>Billing cycle</Text>
            <View style={s.pillRow}>
              {(['monthly', 'yearly', 'weekly', 'custom'] as BillingCycle[]).map((c) => (
                <Pressable key={c} onPress={() => update('billingCycle', c)} style={[s.optionPill, state.billingCycle === c && s.optionPillActive]}>
                  <Text style={[s.optionPillText, state.billingCycle === c && s.optionPillTextActive]}>{c[0].toUpperCase() + c.slice(1)}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={s.label}>Next charge date</Text>
            <Pressable onPress={() => setShowNextChargePicker(true)} style={s.fieldBtn}>
              <Text style={s.fieldBtnText}>{state.nextChargeDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <Ionicons name="calendar-outline" size={18} color={DIM} />
            </Pressable>
          </ScrollView>
        )}

        {step === 2 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Free trial</Text>
            <View style={s.card}>
              <View style={s.row}>
                <Text style={s.rowLabel}>Enable free trial</Text>
                <Switch value={state.hasTrial} onValueChange={(v) => update('hasTrial', v)} trackColor={{ false: '#E0E0E0', true: GREEN }} thumbColor="#fff" />
              </View>
              {state.hasTrial && (
                <Pressable onPress={() => setShowTrialEndPicker(true)} style={[s.fieldBtn, { marginTop: 8 }]}>
                  <Text style={s.fieldBtnText}>Trial ends on {formatDate(state.trialEndDate)}</Text>
                  <Ionicons name="calendar-outline" size={18} color={DIM} />
                </Pressable>
              )}
            </View>
            <Text style={s.helper}>
              {state.hasTrial
                ? `Free trial ends ${formatDate(state.trialEndDate)}. You will be charged ${formatMoney(state.price, state.currency)} after that.`
                : 'No trial enabled.'}
            </Text>
          </View>
        )}

        {step === 3 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Get notified before you’re charged</Text>
            <Text style={s.stepSub}>This is your safety net.</Text>
            <View style={s.pillRow}>
              {[1, 3, 7].map((d) => (
                <Pressable key={d} onPress={() => update('reminderDaysBefore', d)} style={[s.optionPill, state.reminderDaysBefore === d && s.optionPillActive]}>
                  <Text style={[s.optionPillText, state.reminderDaysBefore === d && s.optionPillTextActive]}>
                    {d} day{d > 1 ? 's' : ''} before
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setShowReminderTimePicker(true)} style={s.fieldBtn}>
              <Text style={s.fieldBtnText}>Reminder time: {state.reminderTime}</Text>
              <Ionicons name="time-outline" size={18} color={DIM} />
            </Pressable>
            <View style={s.previewSoft}>
              <Text style={s.previewSoftText}>
                We’ll remind you on {formatDate(reminderDate)} at {state.reminderTime}.
              </Text>
            </View>
          </View>
        )}

        {step === 4 && (
          <View style={s.stepContent}>
            <Text style={s.stepTitle}>Payment method</Text>
            <Text style={s.stepSub}>Optional and lightweight.</Text>
            <View style={s.card}>
              {PAYMENT_METHODS.map((m, idx) => (
                <View key={m}>
                  {idx > 0 ? <View style={s.sep} /> : null}
                  <Pressable onPress={() => update('paymentMethod', m)} style={s.paymentRow}>
                    <Text style={s.paymentText}>{m}</Text>
                    {state.paymentMethod === m ? <Ionicons name="checkmark-circle" size={20} color={GREEN} /> : <Ionicons name="ellipse-outline" size={18} color={DIM} />}
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {step === 5 && (
          <ScrollView style={s.stepContent} contentContainerStyle={s.stepScrollInner} showsVerticalScrollIndicator={false}>
            <Text style={s.stepTitle}>Review</Text>
            <View style={s.card}>
              <SummaryRow label="Service" value={state.serviceName || '—'} />
              <View style={s.sep} />
              <SummaryRow label="Price" value={previewLine} />
              <View style={s.sep} />
              <SummaryRow label="Next charge" value={formatDate(state.nextChargeDate)} />
              <View style={s.sep} />
              <SummaryRow label="Category" value={state.category} />
              <View style={s.sep} />
              <SummaryRow label="Trial" value={state.hasTrial ? `Ends ${formatDate(state.trialEndDate)}` : 'Off'} />
              <View style={s.sep} />
              <SummaryRow
                label="Reminder"
                value={`${state.reminderDaysBefore} day${state.reminderDaysBefore > 1 ? 's' : ''} before at ${state.reminderTime}`}
              />
              <View style={s.sep} />
              <SummaryRow label="Payment" value={state.paymentMethod || 'Not set'} />
            </View>
          </ScrollView>
        )}
      </Animated.View>

      {step < 5 ? (
        <View style={s.bottomCta}>
          <AppButton label="Continue" onPress={onNext} />
          {!canContinue ? <Text style={s.ctaHint}>Enter a valid price to continue.</Text> : null}
        </View>
      ) : null}

      <DatePickerModal
        visible={showNextChargePicker}
        value={state.nextChargeDate}
        onClose={() => setShowNextChargePicker(false)}
        onSelect={(d) => update('nextChargeDate', d)}
        title="Next charge"
      />
      <DatePickerModal
        visible={showTrialEndPicker}
        value={state.trialEndDate}
        onClose={() => setShowTrialEndPicker(false)}
        onSelect={(d) => update('trialEndDate', d)}
        title="Trial end date"
      />
      <TimePickerModal
        visible={showReminderTimePicker}
        value={state.reminderTime}
        onClose={() => setShowReminderTimePicker(false)}
        onSelect={(v) => update('reminderTime', v)}
        title="Reminder time"
      />
    </AppScreen>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: 0.76 },
  progressWrap: { paddingHorizontal: spacing.screenX, paddingBottom: 8 },
  progressText: { fontSize: 13, fontWeight: '600', color: DIM },
  dotRow: { flexDirection: 'row', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(11,8,3,0.14)' },
  dotActive: { backgroundColor: INK },

  stepWrap: { flex: 1 },
  stepContent: { flex: 1, paddingHorizontal: spacing.screenX, paddingTop: 8 },
  stepScrollInner: { paddingBottom: 24 },
  stepTitle: { fontSize: 28, fontWeight: '800', color: INK, marginBottom: 10 },
  stepSub: { fontSize: 15, color: DIM, marginBottom: 14 },

  searchShell: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: CARD,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 18, fontWeight: '500', color: INK, paddingVertical: 14 },
  list: { flex: 1 },
  serviceRow: {
    minHeight: 64,
    backgroundColor: CARD,
    borderRadius: 16,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  serviceName: { fontSize: 16, fontWeight: '700', color: INK },
  serviceMeta: { fontSize: 13, color: DIM, marginTop: 2 },

  previewCard: { backgroundColor: BG, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(11,8,3,0.08)', padding: 14, marginBottom: 16 },
  previewTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  logoFallback: { width: 44, height: 44, borderRadius: 12, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  logoFallbackText: { fontSize: 20, fontWeight: '700', color: INK },
  previewName: { fontSize: 16, fontWeight: '700', color: INK },
  previewLine: { fontSize: 15, fontWeight: '700', color: INK, marginTop: 2 },
  previewMeta: { fontSize: 13, color: DIM },

  label: { fontSize: 12, fontWeight: '700', color: DIM, marginBottom: 8, marginTop: 10, textTransform: 'uppercase' },
  priceRow: { gap: 10 },
  priceInput: { minHeight: 56, borderRadius: 16, backgroundColor: CARD, paddingHorizontal: 14, fontSize: 26, fontWeight: '800', color: INK },
  currencyWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  currencyPill: { minHeight: 40, borderRadius: 999, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD },
  currencyPillActive: { backgroundColor: INK },
  currencyText: { color: INK, fontSize: 13, fontWeight: '700' },
  currencyTextActive: { color: '#FFF' },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  optionPill: { minHeight: 44, borderRadius: 999, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: CARD },
  optionPillActive: { backgroundColor: INK },
  optionPillText: { color: INK, fontSize: 14, fontWeight: '600' },
  optionPillTextActive: { color: '#FFF' },

  fieldBtn: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: CARD,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldBtnText: { fontSize: 15, fontWeight: '600', color: INK },

  helper: { marginTop: 12, fontSize: 15, color: DIM, lineHeight: 21 },
  previewSoft: { marginTop: 16, backgroundColor: CARD, borderRadius: 14, padding: 14 },
  previewSoftText: { fontSize: 15, color: INK, fontWeight: '600' },

  card: { backgroundColor: CARD, borderRadius: radius.card },
  row: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rowLabel: { fontSize: 15, color: DIM, fontWeight: '500' },
  rowValue: { fontSize: 15, color: INK, fontWeight: '700', flex: 1, textAlign: 'right' },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(11,8,3,0.08)', marginHorizontal: 14 },
  paymentRow: {
    minHeight: 52,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentText: { fontSize: 16, fontWeight: '600', color: INK },

  bottomCta: { paddingHorizontal: spacing.screenX, paddingTop: 8, paddingBottom: 14 },
  ctaHint: { marginTop: 6, textAlign: 'center', fontSize: 12, color: DIM },
});
