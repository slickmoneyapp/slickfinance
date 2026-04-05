/**
 * @deprecated Normal editing is inline on `SubscriptionDetailScreen` using `SubscriptionDetailsForm`.
 * This screen remains registered on the root stack only for backward compatibility or manual navigation.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DatePickerModal } from '../components/DatePickerModal';
import { TimePickerModal } from '../components/TimePickerModal';
import { SFIcon } from '../components/SFIcon';
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { hapticImpactMedium, hapticSelection } from '../ui/haptics';
import { AppActionSheet } from '../components/AppActionSheet';
import { CompanyLogo } from '../components/CompanyLogo';
import { requestNotificationPermissions } from '../features/notifications/service';
import { toLocalDateString } from '../features/subscriptions/buildBillingHistoryFromSubscription';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { colors, radius, sheetTypography } from '../ui/theme';
import { AppButton, AppScreen, IconCircleButton, ScreenHeader } from '../ui/components';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import type { BillingCycle, CurrencyCode, Subscription } from '../features/subscriptions/types';
import { CATEGORY_ICONS } from '../features/subscriptions/addSubscriptionCatalog';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSubscription'>;
type SheetType = null | 'billingCycle' | 'list' | 'category' | 'payment' | 'currency' | 'notify' | 'trialLength' | 'paymentMethod';

const TRIAL_LENGTH_OPTIONS = [3, 7, 14, 30] as const;
type TrialLengthDays = (typeof TRIAL_LENGTH_OPTIONS)[number];
const TRIAL_LENGTH_LABELS: Record<number, string> = {
  3: '3 Days',
  7: '7 Days',
  14: '14 Days',
  30: '30 Days',
};

const PAYMENT_METHODS_TAGS = [
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

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'GEL'];
const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = { USD: '$', EUR: 'EUR', GEL: 'GEL' };
const BASE_CATEGORIES: Subscription['category'][] = [
  'Streaming',
  'Music',
  'Productivity',
  'Cloud Storage',
  'Gaming',
  'Fitness',
  'Education',
  'Utilities',
  'Other',
];

function cycleLabel(cycle: BillingCycle, customCycleDays?: number) {
  if (cycle === 'custom') return `Every ${customCycleDays ?? 30} days`;
  if (cycle === 'weekly') return 'Weekly';
  if (cycle === 'monthly') return 'Monthly';
  if (cycle === 'yearly') return 'Yearly';
  return 'Every 3 months';
}

function reminderLabel(days: number, time: string) {
  const when = days === 0 ? 'Same day' : days >= 7 ? '1 week before' : `${days} day${days > 1 ? 's' : ''} before`;
  return `${when} at ${time}`;
}

export function EditSubscriptionScreen({ navigation, route }: Props) {
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
  const { subscriptionId } = route.params;
  const update = useSubscriptionsStore((s) => s.update);
  const [saving, setSaving] = useState(false);
  const sub = useSubscriptionsStore((s) => s.items.find((i) => i.id === subscriptionId));

  const priceRef = useRef<TextInput>(null);

  const [serviceName, setServiceName] = useState(sub?.serviceName ?? '');
  const [domain] = useState(sub?.domain ?? '');
  const [category, setCategory] = useState<string>(sub?.category ?? 'Other');
  const [categories] = useState<string[]>(() => [...BASE_CATEGORIES]);
  const [categorySearch, setCategorySearch] = useState('');

  const [price, setPrice] = useState(sub ? String(sub.price) : '');
  const [currency, setCurrency] = useState<CurrencyCode>(sub?.currency ?? 'USD');

  const [billingCycle, setBillingCycle] = useState<BillingCycle>(sub?.billingCycle ?? 'monthly');
  const [customCycleDays, setCustomCycleDays] = useState<number>(sub?.customCycleDays ?? 30);

  const [nextCharge, setNextCharge] = useState<Date>(sub ? new Date(sub.nextChargeDate) : new Date());
  const [subscriptionStartDate, setSubscriptionStartDate] = useState<Date>(() => {
    if (sub?.subscriptionStartDate) {
      const [y, m, d] = sub.subscriptionStartDate.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }
    return sub ? new Date(sub.createdAt) : new Date();
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);

  /** If start & payment already differ in saved data, don’t overwrite start when payment changes. */
  const subscriptionStartTouchedRef = useRef(
    Boolean(
      sub &&
        sub.subscriptionStartDate !== toLocalDateString(new Date(sub.nextChargeDate))
    )
  );

  const [isTrial, setIsTrial] = useState(sub?.isTrial ?? false);
  const [trialLengthDays, setTrialLengthDays] = useState<TrialLengthDays>(
    () => {
      const saved = sub?.trialLengthDays;
      if (saved != null && (TRIAL_LENGTH_OPTIONS as readonly number[]).includes(saved)) {
        return saved as TrialLengthDays;
      }
      return 7;
    }
  );
  const [list, setList] = useState(sub?.list ?? 'Personal');

  const [paymentMethod, setPaymentMethod] = useState(sub?.paymentMethod ?? 'None');



  const [reminderEnabled, setReminderEnabled] = useState(sub?.reminderEnabled ?? true);
  const [reminderDays, setReminderDays] = useState(sub?.reminderDaysBefore ?? 1);
  const [reminderTime, setReminderTime] = useState(sub?.reminderTime ?? '09:00');
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [url, setUrl] = useState(sub?.url ?? '');
  const [notes, setNotes] = useState(sub?.description ?? '');

  const [sheet, setSheet] = useState<SheetType>(null);
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  useEffect(() => {
    if (!sub) return;
    if (!subscriptionStartTouchedRef.current) {
      setSubscriptionStartDate(new Date(nextCharge.getTime()));
    }
  }, [nextCharge, sub]);

  if (!sub) {
    return (
      <AppScreen edges={['top', 'left', 'right', 'bottom']}>
        <Text style={{ padding: 20, color: INK }}>Subscription not found.</Text>
      </AppScreen>
    );
  }

  async function handleSave() {
    if (!sub || saving) return;
    const numPrice = Number(price.replace(',', '.'));
    if (!serviceName.trim() || !Number.isFinite(numPrice) || numPrice <= 0) {
      Alert.alert('Missing info', 'Enter a service name and a valid price.');
      return;
    }

    setSaving(true);
    void hapticImpactMedium();

    let effectiveNextCharge = nextCharge;
    if (isTrial) {
      const trialEnd = new Date(subscriptionStartDate.getTime());
      trialEnd.setDate(trialEnd.getDate() + trialLengthDays);
      effectiveNextCharge = trialEnd;
    }

    await update(sub.id, {
      serviceName: serviceName.trim(),
      category: (category as Subscription['category']) ?? 'Other',
      price: numPrice,
      currency,
      billingCycle,
      customCycleDays: billingCycle === 'custom' ? Math.max(1, customCycleDays) : undefined,
      subscriptionStartDate: toLocalDateString(subscriptionStartDate),
      nextChargeDate: effectiveNextCharge.toISOString(),
      isTrial,
      trialLengthDays: isTrial ? trialLengthDays : null,
      status: isTrial ? 'trial' : sub.status === 'cancelled' ? 'cancelled' : 'active',
      list,
      paymentMethod: paymentMethod === 'None' ? undefined : paymentMethod,
      reminderEnabled,
      reminderDaysBefore: reminderDays,
      reminderTime,
      url: url.trim() || undefined,
      description: notes.trim() || undefined,
    });

    navigation.goBack();
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
      style={[
        s.screenRoot,
        {
          paddingTop: layoutInsets.top,
          paddingBottom: layoutInsets.bottom,
          paddingLeft: layoutInsets.left,
          paddingRight: layoutInsets.right,
        },
      ]}
    >
      <ScreenHeader
        title="Edit Subscription"
        left={<IconCircleButton icon="chevron.left" onPress={() => navigation.goBack()} />}
        right={<AppButton label="Save" onPress={handleSave} loading={saving} />}
      />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
        keyboardDismissMode="interactive"
      >
          <View style={[s.card, s.heroCard]}>
            <View style={s.heroTop}>
              {domain ? (
                <View style={s.heroLogoOuter}>
                  <CompanyLogo domain={domain} size={48} rounded={24} fallbackText={serviceName || '?'} />
                </View>
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
                style={({ pressed }) => [s.currencyPill, pressed && s.pressed]}
              >
                <Text style={s.currencyPillText}>{CURRENCY_SYMBOLS[currency]}</Text>
                <SFIcon name="chevron.right" size={12} color={DIM} />
              </Pressable>

              <Pressable
                onPress={() => {
                  void hapticSelection();
                  priceRef.current?.focus();
                }}
                style={({ pressed }) => [s.pricePress, pressed && s.pressed]}
              >
                <TextInput
                  ref={priceRef}
                  value={price}
                  onChangeText={setPrice}
                  placeholder="0.00"
                  placeholderTextColor={DIM}
                  keyboardType="decimal-pad"
                  style={s.priceInput}
                />
              </Pressable>
            </View>
          </View>

          <View style={[s.card, { marginTop: 14 }]}>
            <FormRow label="Payment date" onPress={() => setShowDatePicker(true)}>
              <Text style={s.valueText}>
                {nextCharge.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </FormRow>
            <Text style={s.startHint}>When your next charge is due.</Text>
            <Divider />

            <FormRow label="Subscription start" onPress={() => setShowStartDatePicker(true)}>
              <Text style={s.valueText}>
                {subscriptionStartDate.toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </FormRow>
            <Text style={s.startHint}>
              First charge or member since — set earlier if you subscribed before installing the app. Matches payment date until you change it. Updates month-by-month history.
            </Text>
            <Divider />

            <FormRow label="Billing Cycle" onPress={() => setSheet('billingCycle')}>
              <Text style={s.valueText}>{cycleLabel(billingCycle, customCycleDays)}</Text>
            </FormRow>

            <Divider />

            <View style={s.formRow}>
              <Text style={s.formRowLabel}>Free Trial</Text>
              <Switch
                value={isTrial}
                onValueChange={setIsTrial}
                trackColor={{ false: '#E0E0E0', true: GREEN }}
                thumbColor="#fff"
              />
            </View>
            {isTrial && (
              <>
                <Divider />
                <FormRow label="Trial Length" onPress={() => setSheet('trialLength')}>
                  <Text style={s.valueText}>{TRIAL_LENGTH_LABELS[trialLengthDays] ?? `${trialLengthDays} Days`}</Text>
                </FormRow>
              </>
            )}
          </View>

          <View style={[s.card, { marginTop: 10 }]}>
            <FormRow label="List" onPress={() => setSheet('list')}>
              <Text style={s.valueText}>{list}</Text>
            </FormRow>

            <Divider />

            <FormRow label="Category" onPress={() => setSheet('category')}>
              <Text style={s.valueText}>{category}</Text>
            </FormRow>

            <Divider />

            <FormRow label="Payment Method" onPress={() => setSheet('payment')}>
              <Text style={s.valueText}>{paymentMethod || 'None'}</Text>
            </FormRow>
          </View>

          <View style={[s.card, { marginTop: 10 }]}>
            <View style={s.formRow}>
              <Text style={s.formRowLabel}>Reminder</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{ false: '#E0E0E0', true: GREEN }}
                thumbColor="#fff"
              />
            </View>

            {reminderEnabled && (
              <>
                <Divider />
                <FormRow label="Notify me" onPress={() => setSheet('notify')}>
                  <Text style={s.valueText}>{reminderLabel(reminderDays, reminderTime)}</Text>
                </FormRow>
                <Divider />
                <FormRow label="Time" onPress={() => setShowTimePicker(true)}>
                  <Text style={s.valueText}>{reminderTime}</Text>
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
                {CURRENCIES.map((item) => (
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
                {[
                  { id: 'weekly', label: 'Weekly' },
                  { id: 'monthly', label: 'Monthly' },
                  { id: 'yearly', label: 'Yearly' },
                  { id: 'custom', label: 'Custom' },
                ].map((item) => (
                  <SheetOption
                    key={item.id}
                    label={item.label}
                    selected={billingCycle === item.id}
                    onPress={() => setBillingCycle(item.id as BillingCycle)}
                  />
                ))}
                {billingCycle === 'custom' && (
                  <View style={s.inlineEditor}>
                    <Text style={s.inlineLabel}>Custom interval (days)</Text>
                    <TextInput
                      value={String(customCycleDays)}
                      onChangeText={(t) => setCustomCycleDays(Math.max(1, Number(t.replace(/\D/g, '') || 1)))}
                      keyboardType="number-pad"
                      style={s.inlineInput}
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

          {sheet === 'payment' && (
            <View style={s.sheetRoot}>
              <Text style={s.sheetTitle}>Payment Method</Text>
              <View style={s.tagGrid}>
                {PAYMENT_METHODS_TAGS.map((method) => {
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
                        {method}{selected ? ' ✓' : ''}
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
                    selected={trialLengthDays === opt}
                    onPress={() => {
                      setTrialLengthDays(opt);
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
                    selected={item.days === -1 ? ![0, 1, 3, 7].includes(reminderDays) : reminderDays === item.days}
                    onPress={() => {
                      if (item.days === -1) {
                        if ([0, 1, 3, 7].includes(reminderDays)) setReminderDays(2);
                      } else {
                        setReminderDays(item.days);
                      }
                    }}
                  />
                ))}
                {!([0, 1, 3, 7].includes(reminderDays)) && (
                  <View style={s.inlineEditor}>
                    <Text style={s.inlineLabel}>Custom days before</Text>
                    <TextInput
                      value={String(reminderDays)}
                      onChangeText={(t) => setReminderDays(Math.max(1, Number(t.replace(/\D/g, '') || 1)))}
                      keyboardType="number-pad"
                      style={s.inlineInput}
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
        visible={showTimePicker}
        value={reminderTime}
        onClose={() => setShowTimePicker(false)}
        onSelect={(hhmm) => setReminderTime(hhmm)}
      />
    </View>
  );
}

function Divider() {
  return <View style={s.sep} />;
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
      <View style={s.formRowRight}>
        {children}
        <SFIcon name="chevron.right" size={14} color={DIM} />
      </View>
    </Pressable>
  );
}

function SheetOption({
  label,
  selected,
  onPress,
  trailing,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  trailing?: string;
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
      ) : trailing ? (
        <Text style={s.sheetTrailing}>{trailing}</Text>
      ) : (
        <SFIcon name="chevron.right" size={14} color={DIM} />
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: BG },

  pressed: { opacity: 0.75 },

  card: { backgroundColor: CARD, borderRadius: radius.card },
  sep: { height: 1, backgroundColor: SEP, marginHorizontal: 16 },

  heroCard: { marginTop: 16, paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroLogoOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroFallback: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroFallbackText: { fontSize: 28, fontWeight: '800', color: INK },
  heroName: { flex: 1, fontSize: 18, fontWeight: '700', color: INK },

  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currencyPill: {
    minWidth: 56,
    height: 38,
    borderRadius: 11,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
  },
  currencyPillText: { fontSize: 16, fontWeight: '700', color: INK },
  pricePress: { flex: 1, minHeight: 42, justifyContent: 'center' },
  priceInput: { fontSize: 30, fontWeight: '800', color: INK, letterSpacing: -0.3 },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  formRowLabel: { flex: 1, fontSize: 16, fontWeight: '500', color: INK },
  formRowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  valueText: { fontSize: 16, fontWeight: '500', color: DIM },

  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: DIM,
    marginTop: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  startHint: {
    fontSize: 12,
    fontWeight: '500',
    color: DIM,
    paddingHorizontal: 16,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 16,
  },
  textAreaInput: { fontSize: 15, color: INK, paddingHorizontal: 16, paddingVertical: 14 },

  sheetRoot: { flex: 1, minHeight: 0 },
  sheetScroll: { flex: 1, minHeight: 0 },
  sheetTitle: { ...sheetTypography.title },
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
    fontWeight: '600' as const,
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
    fontSize: 16,
    fontWeight: '600' as const,
    color: INK,
  },
  tagTextSelected: {
    color: '#FFFFFF',
  },
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
  sheetTrailing: { fontSize: 12, fontWeight: '700', color: DIM },

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
  inlineInput: {
    borderRadius: 10,
    backgroundColor: CARD,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: INK,
  },
  smallActionBtn: {
    borderRadius: 10,
    backgroundColor: INK,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  smallActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  sheetDoneBtn: {
    marginTop: 12,
    backgroundColor: INK,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetDoneText: { ...sheetTypography.done },
});
