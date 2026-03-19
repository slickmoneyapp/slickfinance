import React, { useState } from 'react';
import {
  Alert, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet,
  Switch, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CompanyLogo } from '../components/CompanyLogo';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import type { Subscription } from '../features/subscriptions/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSubscription'>;

const BG = '#F5F5F5';
const CARD = '#FFFFFF';
const INK = '#0B0803';
const DIM = 'rgba(11,8,3,0.5)';
const SEP = 'rgba(11,8,3,0.07)';
const GREEN = '#30CE5A';

const CYCLE_OPTIONS: Subscription['billingCycle'][] = ['weekly', 'monthly', 'quarterly', 'yearly'];
const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Every week', monthly: 'Every month',
  quarterly: 'Every 3 months', yearly: 'Every year',
};
const CURRENCIES: Array<'USD' | 'EUR' | 'GEL'> = ['USD', 'EUR', 'GEL'];
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GEL: '₾' };
const CATEGORIES: Subscription['category'][] = [
  'Streaming', 'Music', 'Productivity', 'Cloud Storage', 'Gaming', 'Fitness', 'Education', 'Utilities', 'Other',
];

export function EditSubscriptionScreen({ navigation, route }: Props) {
  const { subscriptionId } = route.params;
  const update = useSubscriptionsStore((s) => s.update);
  const sub = useSubscriptionsStore((s) => s.items.find((i) => i.id === subscriptionId));

  const [serviceName, setServiceName] = useState(sub?.serviceName ?? '');
  const [domain] = useState(sub?.domain ?? '');
  const [category, setCategory] = useState<Subscription['category']>(sub?.category ?? 'Other');
  const [price, setPrice] = useState(sub ? String(sub.price) : '');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GEL'>(sub?.currency ?? 'USD');
  const [billingCycle, setBillingCycle] = useState<Subscription['billingCycle']>(sub?.billingCycle ?? 'monthly');
  const [nextCharge, setNextCharge] = useState<Date>(sub ? new Date(sub.nextChargeDate) : new Date());
  const [isTrial, setIsTrial] = useState(sub?.isTrial ?? false);
  const [list, setList] = useState(sub?.list ?? 'Personal');
  const [paymentMethod, setPaymentMethod] = useState(sub?.paymentMethod ?? '');
  const [reminderEnabled, setReminderEnabled] = useState(sub?.reminderEnabled ?? true);
  const [reminderDays, setReminderDays] = useState(sub?.reminderDaysBefore ?? 1);
  const [url, setUrl] = useState(sub?.url ?? '');
  const [notes, setNotes] = useState(sub?.description ?? '');
  const [showDatePicker, setShowDatePicker] = useState(false);

  if (!sub) {
    return (
      <SafeAreaView style={s.safe}>
        <Text style={{ padding: 20, color: INK }}>Subscription not found.</Text>
      </SafeAreaView>
    );
  }

  function handleSave() {
    const numPrice = Number(price.replace(',', '.'));
    if (!serviceName.trim() || !Number.isFinite(numPrice) || numPrice <= 0) {
      Alert.alert('Missing info', 'Enter a service name and a valid price.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    update(sub!.id, {
      serviceName: serviceName.trim(),
      category,
      price: numPrice,
      currency,
      billingCycle,
      nextChargeDate: nextCharge.toISOString(),
      isTrial,
      status: isTrial ? 'trial' : sub!.status === 'cancelled' ? 'cancelled' : 'active',
      list,
      paymentMethod: paymentMethod.trim() || undefined,
      reminderEnabled,
      reminderDaysBefore: reminderDays,
      url: url.trim() || undefined,
      description: notes.trim() || undefined,
    });
    navigation.goBack();
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.navBar}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [s.navBackBtn, pressed && s.pressed]}>
            <Ionicons name="chevron-back" size={20} color={INK} />
          </Pressable>
          <Text style={s.navTitle}>Edit Subscription</Text>
          <Pressable onPress={handleSave} style={({ pressed }) => [s.saveBtn, pressed && s.pressed]}>
            <Text style={s.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero card */}
          <View style={[s.card, s.heroCard]}>
            <View style={s.heroTop}>
              {domain ? (
                <CompanyLogo domain={domain} size={52} rounded={16} fallbackText={serviceName || '?'} />
              ) : (
                <View style={s.heroFallback}>
                  <Text style={s.heroFallbackText}>{(serviceName[0] ?? '?').toUpperCase()}</Text>
                </View>
              )}
              <TextInput
                value={serviceName}
                onChangeText={setServiceName}
                placeholder="Service name"
                placeholderTextColor={DIM}
                style={s.heroName}
                autoCapitalize="words"
              />
            </View>
            <View style={s.priceRow}>
              <Pressable
                onPress={() => setCurrency(CURRENCIES[(CURRENCIES.indexOf(currency) + 1) % CURRENCIES.length])}
                style={s.currencyPill}
              >
                <Text style={s.currencyPillText}>{CURRENCY_SYMBOLS[currency]}</Text>
              </Pressable>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={DIM}
                keyboardType="decimal-pad"
                style={s.priceInput}
              />
            </View>
          </View>

          {/* Payment details */}
          <View style={[s.card, { marginTop: 14 }]}>
            <FormRow label="Payment date">
              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={({ pressed }) => [s.datePill, pressed && s.pressed]}
              >
                <Text style={s.datePillText}>
                  {nextCharge.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </Pressable>
              {showDatePicker && (
                <DateTimePicker
                  value={nextCharge}
                  mode="date"
                  onChange={(_e: unknown, d?: Date) => { setShowDatePicker(false); if (d) setNextCharge(d); }}
                />
              )}
            </FormRow>
            <View style={s.sep} />
            <FormRow label="Billing Cycle">
              <Pressable
                onPress={() => setBillingCycle(CYCLE_OPTIONS[(CYCLE_OPTIONS.indexOf(billingCycle) + 1) % CYCLE_OPTIONS.length])}
                style={({ pressed }) => pressed && s.pressed}
              >
                <Text style={s.valueText}>{CYCLE_LABELS[billingCycle]}</Text>
              </Pressable>
            </FormRow>
            <View style={s.sep} />
            <FormRow label="Free Trial">
              <Switch
                value={isTrial}
                onValueChange={setIsTrial}
                trackColor={{ false: '#E0E0E0', true: GREEN }}
                thumbColor="#fff"
              />
            </FormRow>
          </View>

          {/* List / Category / Payment */}
          <View style={[s.card, { marginTop: 10 }]}>
            <FormRow label="List">
              <Pressable
                onPress={() => setList(list === 'Personal' ? 'Business' : 'Personal')}
                style={({ pressed }) => [s.pickerTap, pressed && s.pressed]}
              >
                <Text style={s.valueText}>{list}</Text>
                <Ionicons name="chevron-expand" size={13} color={DIM} />
              </Pressable>
            </FormRow>
            <View style={s.sep} />
            <FormRow label="Category">
              <Pressable
                onPress={() => setCategory(CATEGORIES[(CATEGORIES.indexOf(category) + 1) % CATEGORIES.length])}
                style={({ pressed }) => [s.pickerTap, pressed && s.pressed]}
              >
                <Text style={s.valueText}>{category}</Text>
                <Ionicons name="chevron-expand" size={13} color={DIM} />
              </Pressable>
            </FormRow>
            <View style={s.sep} />
            <FormRow label="Payment Method">
              <TextInput
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="None"
                placeholderTextColor={DIM}
                style={s.inlineInput}
                textAlign="right"
              />
              <Ionicons name="chevron-forward" size={14} color="rgba(11,8,3,0.2)" style={{ marginLeft: 2 }} />
            </FormRow>
          </View>

          {/* Reminder */}
          <View style={[s.card, { marginTop: 10 }]}>
            <FormRow label="Reminder">
              <Switch
                value={reminderEnabled}
                onValueChange={setReminderEnabled}
                trackColor={{ false: '#E0E0E0', true: GREEN }}
                thumbColor="#fff"
              />
            </FormRow>
            {reminderEnabled && (
              <>
                <View style={s.sep} />
                <FormRow label="Notify me">
                  <Pressable
                    onPress={() => {
                      const opts = [1, 2, 3, 7];
                      setReminderDays(opts[(opts.indexOf(reminderDays) + 1) % opts.length]);
                    }}
                    style={({ pressed }) => [s.pickerTap, pressed && s.pressed]}
                  >
                    <Text style={s.valueText}>{reminderDays} day{reminderDays > 1 ? 's' : ''} before</Text>
                    <Ionicons name="chevron-expand" size={13} color={DIM} />
                  </Pressable>
                </FormRow>
              </>
            )}
          </View>

          {/* URL */}
          <Text style={s.fieldLabel}>WEBSITE / URL</Text>
          <View style={s.card}>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="e.g. netflix.com"
              placeholderTextColor={DIM}
              style={s.textAreaInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Notes */}
          <Text style={s.fieldLabel}>NOTES</Text>
          <View style={s.card}>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note…"
              placeholderTextColor={DIM}
              style={[s.textAreaInput, { minHeight: 80, textAlignVertical: 'top' }]}
              multiline
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.formRow}>
      <Text style={s.formRowLabel}>{label}</Text>
      <View style={s.formRowRight}>{children}</View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  pressed: { opacity: 0.75 },
  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: SEP, backgroundColor: BG,
  },
  navBackBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: INK },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: INK },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  card: { backgroundColor: CARD, borderRadius: 22 },
  sep: { height: 1, backgroundColor: SEP, marginHorizontal: 16 },
  heroCard: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroFallback: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  heroFallbackText: { fontSize: 22, fontWeight: '800', color: INK },
  heroName: { flex: 1, fontSize: 18, fontWeight: '700', color: INK },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currencyPill: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  currencyPillText: { fontSize: 16, fontWeight: '700', color: INK },
  priceInput: { flex: 1, fontSize: 24, fontWeight: '700', color: INK },
  formRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  formRowLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: INK },
  formRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  datePill: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: BG, borderRadius: 10 },
  datePillText: { fontSize: 14, fontWeight: '600', color: INK },
  valueText: { fontSize: 14, fontWeight: '500', color: DIM },
  pickerTap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  inlineInput: { fontSize: 14, fontWeight: '500', color: DIM, minWidth: 80 },
  fieldLabel: {
    fontSize: 11, fontWeight: '700', color: DIM,
    marginTop: 20, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  textAreaInput: { fontSize: 15, color: INK, paddingHorizontal: 16, paddingVertical: 14 },
});
