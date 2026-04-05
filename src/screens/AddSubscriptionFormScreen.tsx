import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SFIcon } from '../components/SFIcon';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { AppActionSheet } from '../components/AppActionSheet';
import { DatePickerModal } from '../components/DatePickerModal';
import { TimePickerModal } from '../components/TimePickerModal';
import { hapticImpactMedium, hapticSelection } from '../ui/haptics';
import { CompanyLogo } from '../components/CompanyLogo';
import { toLocalDateString } from '../features/subscriptions/buildBillingHistoryFromSubscription';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { requestNotificationPermissions } from '../features/notifications/service';
import { colors, radius, sheetTypography } from '../ui/theme';
import { AppButton, IconCircleButton, ScreenHeader } from '../ui/components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AddSubscriptionStackParamList } from '../navigation/AddSubscriptionStack';
import type { Subscription } from '../features/subscriptions/types';
import {
  ADD_SUBSCRIPTION_CURRENCIES,
  BASE_CATEGORIES,
  BILLING_CYCLE_LABELS,
  BILLING_CYCLE_OPTIONS,
  CATEGORY_ICONS,
  CURRENCY_SYMBOLS,
} from '../features/subscriptions/addSubscriptionCatalog';

type Props = NativeStackScreenProps<AddSubscriptionStackParamList, 'AddSubscriptionForm'>;
type SheetType = null | 'list' | 'category' | 'currency' | 'billingCycle' | 'notify' | 'trialLength' | 'paymentMethod';

type TrialLength = '3d' | '7d' | '1m';
const TRIAL_LENGTH_OPTIONS: TrialLength[] = ['3d', '7d', '1m'];
const TRIAL_LENGTH_LABELS: Record<TrialLength, string> = {
  '3d': '3 Days',
  '7d': '7 Days',
  '1m': '1 Month',
};

const PAYMENT_METHODS = [
  'Cash', 'Credit Card', 'Debit Card',
  'PayPal', 'Google Pay', 'Apple Pay',
  'Stripe', 'Bank Transfer', 'Crypto',
  'AliPay', 'WeChat', 'SEPA', 'Klarna',
  'Venmo', 'Interac',
];

const BG = colors.bg;
const CARD = colors.surface;
const INK = colors.text;
const DIM = colors.textMuted;
const SEP = colors.borderSoft;
const GREEN = colors.success;

export function AddSubscriptionFormScreen({ navigation, route }: Props) {
  const { serviceName: initialName, domain: initialDomain, category: initialCategory } = route.params;

  const safeAreaInsets = useSafeAreaInsets();
  const layoutInsets = useMemo<EdgeInsets>(
    () => ({
      top: Math.max(safeAreaInsets.top, 12),
      bottom: Math.max(safeAreaInsets.bottom, 12),
      left: safeAreaInsets.left,
      right: safeAreaInsets.right,
    }),
    [safeAreaInsets]
  );
  const add = useSubscriptionsStore((s) => s.add);
  const [saving, setSaving] = useState(false);

  const priceRef = useRef<TextInput>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [sheet, setSheet] = useState<SheetType>(null);
  const [serviceName, setServiceName] = useState(initialName);
  /** Set from picker only; no domain field on form yet */
  const [domain] = useState(initialDomain);
  const [category, setCategory] = useState<string>(initialCategory);
  const [categories] = useState<string[]>(() => [...BASE_CATEGORIES]);
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GEL'>('USD');
  const [billingCycle, setBillingCycle] = useState<Subscription['billingCycle']>('monthly');
  const [nextCharge, setNextCharge] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d;
  });
  const subscriptionStartTouchedRef = useRef(false);
  const [isTrial, setIsTrial] = useState(false);
  const [trialLength, setTrialLength] = useState<TrialLength>('7d');
  const [list, setList] = useState('Personal');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(1);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => priceRef.current?.focus(), 400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!subscriptionStartTouchedRef.current) {
      setSubscriptionStartDate(new Date(nextCharge.getTime()));
    }
  }, [nextCharge]);

  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  useEffect(() => {
    if (!__DEV__ || sheet === null) return;
    console.log('[AddSubscriptionForm] open sheet', {
      sheet,
      currencyOptions: ADD_SUBSCRIPTION_CURRENCIES.length,
      billingCycleOptions: BILLING_CYCLE_OPTIONS.length,
      listOptions: 2,
      categoryOptions: filteredCategories.length,
      paymentMethodOptions: PAYMENT_METHODS.length,
      trialLengthOptions: TRIAL_LENGTH_OPTIONS.length,
      notifyOptions: 5,
    });
  }, [filteredCategories.length, sheet]);

  async function handleSave() {
    if (saving) return;
    const numPrice = Number(price.replace(',', '.'));
    if (!serviceName.trim() || !Number.isFinite(numPrice) || numPrice <= 0) {
      Alert.alert('Missing info', 'Enter a service name and a valid price.');
      return;
    }
    setSaving(true);
    void hapticImpactMedium();
    await add({
      serviceName: serviceName.trim(),
      domain: domain.trim() || undefined,
      category: (category as Subscription['category']) ?? 'Other',
      price: numPrice,
      currency,
      billingCycle,
      subscriptionStartDate: toLocalDateString(subscriptionStartDate),
      nextChargeDate: nextCharge.toISOString(),
      isTrial,
      list,
      paymentMethod: paymentMethod.trim() || undefined,
      reminderEnabled,
      reminderDaysBefore: reminderDays,
      reminderTime,
      url: url.trim() || undefined,
      description: notes.trim() || undefined,
      status: isTrial ? 'trial' : 'active',
    });
    navigation.getParent()?.goBack();
  }

  async function handleReminderToggle(value: boolean) {
    if (!value) {
      setReminderEnabled(false);
      return;
    }
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(
        'Enable notifications',
        'Allow notifications to receive upcoming charge reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      setReminderEnabled(false);
      return;
    }
    setReminderEnabled(true);
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.bg,
        paddingTop: layoutInsets.top,
        paddingBottom: layoutInsets.bottom,
      }}
    >
      <ScreenHeader
        title="Add Subscription"
        left={<IconCircleButton icon="chevron.left" onPress={() => navigation.goBack()} />}
        right={<AppButton label="Save" onPress={handleSave} loading={saving} />}
      />
      <ScrollView
        style={s.formScroll}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
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
              onPress={() => {
                void hapticSelection();
                setSheet('currency');
              }}
              style={s.currencyPill}
            >
              <Text style={s.currencyPillText}>{CURRENCY_SYMBOLS[currency]}</Text>
            </Pressable>
            <TextInput
              ref={priceRef}
              value={price}
              onChangeText={setPrice}
              placeholder="0.00"
              placeholderTextColor={DIM}
              keyboardType="decimal-pad"
              style={s.priceInput}
            />
          </View>
        </View>

        <View style={[s.card, { marginTop: 14 }]}>
          <FormRow label="Payment date">
            <Pressable
              onPress={() => {
                void hapticSelection();
                setShowDatePicker(true);
              }}
              style={({ pressed }) => [s.datePill, pressed && s.pressed]}
            >
              <Text style={s.datePillText}>
                {nextCharge.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </Pressable>
          </FormRow>
          <Text style={s.startHint}>When your next charge is due.</Text>
          <View style={s.sep} />
          <FormRow
            label="Subscription start"
            onPress={() => {
              void hapticSelection();
              setShowStartDatePicker(true);
            }}
          >
            <Text style={s.valueText}>
              {subscriptionStartDate.toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            <SFIcon name="chevron.right" size={14} color={DIM} />
          </FormRow>
          <Text style={s.startHint}>
            First charge or member since — set earlier if you used this service long before installing the app. Matches
            payment date until you change it.
          </Text>
          <View style={s.sep} />
          <FormRow label="Billing Cycle" onPress={() => setSheet('billingCycle')}>
            <Text style={s.valueText}>{BILLING_CYCLE_LABELS[billingCycle]}</Text>
            <SFIcon name="chevron.right" size={14} color={DIM} />
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
          {isTrial && (
            <>
              <View style={s.sep} />
              <FormRow label="Trial Length" onPress={() => setSheet('trialLength')}>
                <Text style={s.valueText}>{TRIAL_LENGTH_LABELS[trialLength]}</Text>
                <SFIcon name="chevron.right" size={14} color={DIM} />
              </FormRow>
            </>
          )}
        </View>

        <View style={[s.card, { marginTop: 10 }]}>
          <FormRow label="List" onPress={() => setSheet('list')}>
            <Text style={s.valueText}>{list}</Text>
            <SFIcon name="chevron.right" size={14} color={DIM} />
          </FormRow>
          <View style={s.sep} />
          <FormRow label="Category" onPress={() => setSheet('category')}>
            <Text style={s.valueText}>{category}</Text>
            <SFIcon name="chevron.right" size={14} color={DIM} />
          </FormRow>
          <View style={s.sep} />
          <FormRow label="Payment Method" onPress={() => setSheet('paymentMethod')}>
            <Text style={s.valueText}>{paymentMethod || 'None'}</Text>
            <SFIcon name="chevron.right" size={14} color={DIM} />
          </FormRow>
        </View>

        <View style={[s.card, { marginTop: 10 }]}>
          <FormRow label="Reminder">
            <Switch
              value={reminderEnabled}
              onValueChange={handleReminderToggle}
              trackColor={{ false: '#E0E0E0', true: GREEN }}
              thumbColor="#fff"
            />
          </FormRow>
          {reminderEnabled && (
            <>
              <View style={s.sep} />
              <FormRow label="Notify me" onPress={() => setSheet('notify')}>
                <Text style={s.valueText}>
                  {reminderDays === 0
                    ? 'Same day'
                    : reminderDays === 7
                      ? '1 week before'
                      : `${reminderDays} day${reminderDays > 1 ? 's' : ''} before`}
                </Text>
                <SFIcon name="chevron.right" size={14} color={DIM} />
              </FormRow>
              <View style={s.sep} />
              <FormRow label="Time">
                <Pressable
                  onPress={() => {
                    void hapticSelection();
                    setShowReminderTimePicker(true);
                  }}
                  style={({ pressed }) => [s.pickerTap, pressed && s.pressed]}
                >
                  <Text style={s.valueText}>{reminderTime}</Text>
                  <SFIcon name="chevron.right" size={13} color={DIM} />
                </Pressable>
              </FormRow>
            </>
          )}
        </View>

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

      <AppActionSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        safeAreaInsets={layoutInsets}
        maxHeight={sheet === 'category' ? 9999 : undefined}
      >
        {sheet === 'currency' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Currency</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {ADD_SUBSCRIPTION_CURRENCIES.map((item) => (
                <SheetOption
                  key={item}
                  label={`${item} (${CURRENCY_SYMBOLS[item]})`}
                  selected={currency === item}
                  onPress={() => {
                    setCurrency(item);
                    setSheet(null);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {sheet === 'billingCycle' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Billing Cycle</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {BILLING_CYCLE_OPTIONS.map((c) => (
                <SheetOption
                  key={c}
                  label={BILLING_CYCLE_LABELS[c]}
                  selected={billingCycle === c}
                  onPress={() => {
                    setBillingCycle(c);
                    setSheet(null);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {sheet === 'list' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Select List</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {['Personal', 'Business'].map((item) => (
                <SheetOption
                  key={item}
                  label={item}
                  selected={list === item}
                  onPress={() => {
                    setList(item);
                    setSheet(null);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {sheet === 'category' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Category</Text>
            <TextInput
              value={categorySearch}
              onChangeText={setCategorySearch}
              placeholder="Search category"
              placeholderTextColor={DIM}
              style={s.sheetSearch}
            />
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {filteredCategories.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    void hapticSelection();
                    setCategory(item);
                    setSheet(null);
                  }}
                  style={({ pressed }) => [s.catOption, pressed && s.pressed]}
                >
                  <View style={[s.catIconWrap, category === item && s.catIconWrapSelected]}>
                    <SFIcon
                      name={CATEGORY_ICONS[item] ?? 'ellipsis.circle'}
                      size={20}
                      color={category === item ? '#fff' : INK}
                    />
                  </View>
                  <Text style={s.catOptionText}>{item}</Text>
                  {category === item && (
                    <SFIcon name="checkmark.circle.fill" size={18} color={GREEN} style={{ marginLeft: 'auto' }} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}

        {sheet === 'paymentMethod' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Payment Method</Text>
            <View style={s.tagGrid}>
              {PAYMENT_METHODS.map((method) => {
                const selected = paymentMethod === method;
                return (
                  <Pressable
                    key={method}
                    onPress={() => {
                      void hapticSelection();
                      setPaymentMethod(selected ? '' : method);
                      if (!selected) setSheet(null);
                    }}
                    style={[s.tag, selected && s.tagSelected]}
                  >
                    <Text style={[s.tagText, selected && s.tagTextSelected]}>
                      {method}
                      {selected ? ' ✓' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {sheet === 'trialLength' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Trial Length</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {TRIAL_LENGTH_OPTIONS.map((opt) => (
                <SheetOption
                  key={opt}
                  label={TRIAL_LENGTH_LABELS[opt]}
                  selected={trialLength === opt}
                  onPress={() => {
                    setTrialLength(opt);
                    setSheet(null);
                  }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {sheet === 'notify' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Notification Settings</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
              {[
                { days: 0, label: 'Same day' },
                { days: 1, label: '1 day before' },
                { days: 3, label: '3 days before' },
                { days: 7, label: '1 week before' },
                { days: -1, label: 'Custom' },
              ].map((item) => (
                <SheetOption
                  key={item.label}
                  label={item.label}
                  selected={
                    item.days === -1 ? ![0, 1, 3, 7].includes(reminderDays) : reminderDays === item.days
                  }
                  onPress={() => {
                    if (item.days === -1) {
                      if ([0, 1, 3, 7].includes(reminderDays)) setReminderDays(2);
                    } else {
                      setReminderDays(item.days);
                    }
                  }}
                />
              ))}
              {![0, 1, 3, 7].includes(reminderDays) && (
                <View style={s.inlineEditor}>
                  <Text style={s.inlineLabel}>Custom days before</Text>
                  <TextInput
                    value={String(reminderDays)}
                    onChangeText={(t) => setReminderDays(Math.max(1, Number(t.replace(/\D/g, '') || 1)))}
                    keyboardType="number-pad"
                    style={s.sheetTextInput}
                  />
                </View>
              )}
            </ScrollView>
            <Pressable
              onPress={() => {
                void hapticSelection();
                setSheet(null);
              }}
              style={s.sheetDoneBtn}
            >
              <Text style={s.sheetDoneText}>Confirm</Text>
            </Pressable>
          </View>
        )}
      </AppActionSheet>

      <DatePickerModal
        visible={showDatePicker}
        value={nextCharge}
        onClose={() => setShowDatePicker(false)}
        onSelect={(d) => setNextCharge(d)}
        title="Payment date"
      />
      <DatePickerModal
        visible={showStartDatePicker}
        value={subscriptionStartDate}
        onClose={() => setShowStartDatePicker(false)}
        onSelect={(d) => {
          subscriptionStartTouchedRef.current = true;
          setSubscriptionStartDate(d);
        }}
        title="Subscription start"
      />
      <TimePickerModal
        visible={showReminderTimePicker}
        value={reminderTime}
        onClose={() => setShowReminderTimePicker(false)}
        onSelect={(hhmm) => setReminderTime(hhmm)}
      />
    </View>
  );
}

function FormRow({
  label,
  children,
  onPress,
}: {
  label: string;
  children: React.ReactNode;
  onPress?: () => void;
}) {
  if (!onPress) {
    return (
      <View style={s.formRow}>
        <Text style={s.formRowLabel}>{label}</Text>
        <View style={s.formRowRight}>{children}</View>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [s.formRow, pressed && s.pressed]}
    >
      <Text style={s.formRowLabel}>{label}</Text>
      <View style={s.formRowRight}>{children}</View>
    </Pressable>
  );
}

function SheetOption({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [s.sheetOption, pressed && s.pressed]}
    >
      <Text style={s.sheetOptionText}>{label}</Text>
      {selected ? (
        <SFIcon name="checkmark.circle.fill" size={18} color={GREEN} />
      ) : (
        <SFIcon name="chevron.right" size={14} color={DIM} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: 0.75 },
  card: { backgroundColor: CARD, borderRadius: radius.card },
  sep: { height: 1, backgroundColor: SEP, marginHorizontal: 16 },
  formScroll: { flex: 1 },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  formRowLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: INK },
  formRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroCard: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroFallback: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackText: { fontSize: 22, fontWeight: '800', color: INK },
  heroName: { flex: 1, fontSize: 18, fontWeight: '700', color: INK },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currencyPill: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currencyPillText: { fontSize: 16, fontWeight: '700', color: INK },
  priceInput: { flex: 1, fontSize: 24, fontWeight: '700', color: INK },
  datePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: BG,
    borderRadius: 10,
  },
  datePillText: { fontSize: 14, fontWeight: '600', color: INK },
  valueText: { fontSize: 14, fontWeight: '500', color: DIM },
  pickerTap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DIM,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textAreaInput: { fontSize: 15, color: INK, paddingHorizontal: 16, paddingVertical: 14 },
  startHint: {
    fontSize: 12,
    fontWeight: '500',
    color: DIM,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 16,
  },
  sheetRoot: { flex: 1, minHeight: 0 },
  sheetScroll: { flex: 1, minHeight: 0 },
  sheetTitle: { ...sheetTypography.title },
  sheetOption: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: BG,
    marginBottom: 8,
  },
  sheetOptionText: { ...sheetTypography.option },
  sheetSearch: {
    ...sheetTypography.search,
    borderRadius: 12,
    backgroundColor: BG,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  inlineEditor: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: BG,
    gap: 8,
  },
  inlineLabel: { ...sheetTypography.inlineLabel },
  sheetTextInput: {
    borderRadius: 10,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: INK,
  },
  catOption: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 12,
  },
  catIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  catIconWrapSelected: {
    backgroundColor: GREEN,
  },
  catOptionText: {
    fontSize: 15,
    fontWeight: '600',
    color: INK,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 8,
  },
  tag: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: SEP,
  },
  tagSelected: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '600',
    color: INK,
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
  sheetDoneBtn: {
    marginTop: 12,
    backgroundColor: INK,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetDoneText: { ...sheetTypography.done },
});
