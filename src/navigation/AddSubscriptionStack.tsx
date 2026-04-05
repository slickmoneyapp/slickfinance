import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackHeaderItem, NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  DynamicColorIOS,
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
import { useSafeAreaInsets, type EdgeInsets } from 'react-native-safe-area-context';
import { SFIcon } from '../components/SFIcon';
import { CompanyLogo } from '../components/CompanyLogo';
import { AppActionSheet } from '../components/AppActionSheet';
import { DatePickerModal } from '../components/DatePickerModal';
import { TimePickerModal } from '../components/TimePickerModal';
import { hapticImpactMedium, hapticSelection } from '../ui/haptics';
import { toLocalDateString } from '../features/subscriptions/buildBillingHistoryFromSubscription';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { requestNotificationPermissions } from '../features/notifications/service';
import { searchBrands, type BrandResult } from '../utils/brandSearch';
import { colors, sheetTypography, spacing } from '../ui/theme';
import type { Subscription } from '../features/subscriptions/types';
import {
  ADD_SUBSCRIPTION_CURRENCIES,
  BASE_CATEGORIES,
  BILLING_CYCLE_LABELS,
  BILLING_CYCLE_OPTIONS,
  CATEGORY_ICONS,
  CURRENCY_SYMBOLS,
  POPULAR_SERVICES_BY_SECTION,
  type ServiceTemplate,
} from '../features/subscriptions/addSubscriptionCatalog';

/* ------------------------------------------------------------------ */
/*  iOS dynamic colors — exact match with SettingsScreen               */
/* ------------------------------------------------------------------ */

const iosDynamic = (light: string, dark: string, fallback: string = light) =>
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : fallback;

const IOS_CARD_BG = iosDynamic('#FFFFFF', '#1C1C1E');
const IOS_PRIMARY = iosDynamic('#111111', '#FFFFFF', colors.text);
const IOS_SECONDARY = iosDynamic(
  'rgba(60, 60, 67, 0.62)',
  'rgba(235, 235, 245, 0.60)',
  colors.textMuted,
);
const IOS_SEPARATOR = iosDynamic(
  'rgba(60, 60, 67, 0.24)',
  'rgba(84, 84, 88, 0.65)',
  colors.borderSoft,
);
const IOS_ROW_HIGHLIGHT = iosDynamic(
  'rgba(120, 120, 128, 0.12)',
  'rgba(118, 118, 128, 0.24)',
);

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ParentStackParamList = { AddSubscription: undefined };

export type AddSubscriptionFlowParamList = {
  CompanyPicker: undefined;
  Details: { companyName: string; domain: string; category: string };
};

type FlowState =
  | { screen: 'picker' }
  | { screen: 'details'; companyName: string; domain: string; category: string; price: number };

type SheetType =
  | null
  | 'currency'
  | 'billingCycle'
  | 'list'
  | 'category'
  | 'paymentMethod'
  | 'trialLength'
  | 'notify';

type TrialLength = '3d' | '7d' | '1m';

/* ------------------------------------------------------------------ */
/*  Catalog constants                                                  */
/* ------------------------------------------------------------------ */

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

function formatStartingPrice(price: number): string {
  const formatted = price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
  return `${formatted}/m`;
}

const SHEET_BG = colors.bg;
const SHEET_CARD = colors.surface;
const SHEET_INK = colors.text;
const SHEET_DIM = colors.textMuted;
const SHEET_SEP = colors.borderSoft;
const SHEET_GREEN = colors.success;

/* ================================================================== */
/*  Flow Navigator                                                     */
/* ================================================================== */

export function AddSubscriptionFlowNavigator() {
  const parentNav =
    useNavigation<NativeStackNavigationProp<ParentStackParamList>>();

  const [flow, setFlow] = useState<FlowState>({ screen: 'picker' });
  const [searchText, setSearchText] = useState('');
  const saveRef = useRef<(() => Promise<void>) | null>(null);

  const dismiss = useCallback(() => parentNav.goBack(), [parentNav]);

  useLayoutEffect(() => {
    if (flow.screen === 'picker') {
      parentNav.setOptions({
        title: 'Add Subscription',
        headerLargeTitle: true,
        headerSearchBarOptions: {
          placeholder: 'Search companies',
          onChangeText: (e: { nativeEvent: { text: string } }) => {
            setSearchText(e.nativeEvent.text ?? '');
          },
        },
        headerLeft: () => null,
        headerRight: () => null,
        ...(Platform.OS === 'ios'
          ? {
              unstable_headerLeftItems: (): NativeStackHeaderItem[] => [
                {
                  type: 'button',
                  label: '',
                  icon: { type: 'sfSymbol', name: 'xmark' },
                  tintColor: '#8E8E93',
                  onPress: dismiss,
                  accessibilityLabel: 'Close',
                },
              ],
              unstable_headerRightItems: undefined,
            }
          : {
              headerLeft: () => (
                <Pressable onPress={dismiss} accessibilityLabel="Close" hitSlop={8}>
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </Pressable>
              ),
            }),
      });
    } else {
      const goBackToPicker = () => setFlow({ screen: 'picker' });
      parentNav.setOptions({
        title: 'Details',
        headerLargeTitle: false,
        headerSearchBarOptions: undefined,
        ...(Platform.OS === 'ios'
          ? {
              unstable_headerLeftItems: (): NativeStackHeaderItem[] => [
                {
                  type: 'button',
                  label: 'Back',
                  icon: { type: 'sfSymbol', name: 'chevron.backward' },
                  tintColor: '#8E8E93',
                  onPress: goBackToPicker,
                  accessibilityLabel: 'Back',
                },
              ],
              unstable_headerRightItems: (): NativeStackHeaderItem[] => [
                {
                  type: 'button',
                  label: 'Save',
                  variant: 'prominent',
                  tintColor: '#CB30E0',
                  onPress: () => { void saveRef.current?.(); },
                  accessibilityLabel: 'Save',
                },
              ],
            }
          : {
              headerLeft: () => (
                <Pressable onPress={goBackToPicker} accessibilityLabel="Back" hitSlop={8}>
                  <Ionicons name="chevron-back" size={24} color="#8E8E93" />
                </Pressable>
              ),
              headerRight: () => (
                <Pressable
                  onPress={() => { void saveRef.current?.(); }}
                  accessibilityRole="button"
                  style={s.androidSaveButton}
                >
                  <Text style={s.androidSaveLabel}>Save</Text>
                </Pressable>
              ),
            }),
      });
    }
  }, [flow.screen, parentNav, dismiss]);

  if (flow.screen === 'details') {
    return (
      <DetailsBody
        companyName={flow.companyName}
        domain={flow.domain}
        initialCategory={flow.category}
        initialPrice={flow.price}
        saveRef={saveRef}
        onDismiss={dismiss}
      />
    );
  }

  return (
    <PickerBody
      searchText={searchText}
      onSelectCompany={(name, domain, category, price) =>
        setFlow({ screen: 'details', companyName: name, domain, category, price })
      }
    />
  );
}

/* ================================================================== */
/*  Picker Body                                                        */
/* ================================================================== */

function PickerBody({
  searchText,
  onSelectCompany,
}: {
  searchText: string;
  onSelectCompany: (name: string, domain: string, category: string, price: number) => void;
}) {
  const [apiResults, setApiResults] = useState<BrandResult[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasQuery = searchText.trim().length > 0;
  const query = searchText.trim().toLowerCase();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!hasQuery) {
      setApiResults([]);
      setApiLoading(false);
      return;
    }
    setApiLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchBrands(searchText.trim());
      setApiResults(results);
      setApiLoading(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText, hasQuery]);

  const localMatches = useMemo(() => {
    if (!hasQuery) return [];
    const matches: ServiceTemplate[] = [];
    for (const group of POPULAR_SERVICES_BY_SECTION) {
      for (const item of group.items) {
        if (item.name.toLowerCase().includes(query)) matches.push(item);
      }
    }
    return matches;
  }, [hasQuery, query]);

  const uniqueApiResults = useMemo(() => {
    if (!hasQuery) return [];
    const localDomains = new Set(localMatches.map((m) => m.domain));
    return apiResults.filter((r) => !localDomains.has(r.domain));
  }, [hasQuery, localMatches, apiResults]);

  const hasAnyResults = localMatches.length > 0 || uniqueApiResults.length > 0;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.pickerContent}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {/* ── Popular services (no search query) ──────── */}
      {!hasQuery &&
        POPULAR_SERVICES_BY_SECTION.map((group, groupIdx) => (
          <React.Fragment key={group.section}>
            <SectionHeader first={groupIdx === 0}>{group.section}</SectionHeader>
            <GroupedCard>
              {group.items.map((item, index) => (
                <View key={item.name}>
                  {index > 0 && <View style={s.pickerSep} />}
                  <PickerServiceRow
                    name={item.name}
                    domain={item.domain}
                    subtitle={formatStartingPrice(item.startingPrice)}
                    onPress={() =>
                      onSelectCompany(item.name, item.domain, item.category, item.startingPrice)
                    }
                  />
                </View>
              ))}
            </GroupedCard>
          </React.Fragment>
        ))}

      {/* ── Search results ──────────────────────────── */}
      {hasQuery && (
        <>
          {(localMatches.length > 0 || uniqueApiResults.length > 0) && (
            <>
              <SectionHeader first>Results</SectionHeader>
              <GroupedCard>
                {localMatches.map((item, index) => (
                  <View key={`local-${item.domain}`}>
                    {index > 0 && <View style={s.pickerSep} />}
                    <PickerServiceRow
                      name={item.name}
                      domain={item.domain}
                      subtitle={formatStartingPrice(item.startingPrice)}
                      onPress={() =>
                        onSelectCompany(item.name, item.domain, item.category, item.startingPrice)
                      }
                    />
                  </View>
                ))}
                {uniqueApiResults.map((item, index) => (
                  <View key={`api-${item.domain}`}>
                    {(index > 0 || localMatches.length > 0) && <View style={s.pickerSep} />}
                    <PickerServiceRow
                      name={item.name}
                      domain={item.domain}
                      subtitle={item.domain}
                      onPress={() =>
                        onSelectCompany(item.name, item.domain, 'Other', 0)
                      }
                    />
                  </View>
                ))}
              </GroupedCard>
            </>
          )}

          {apiLoading && !hasAnyResults && (
            <View style={s.loadingState}>
              <ActivityIndicator size="large" color={IOS_SECONDARY} />
            </View>
          )}

          {!apiLoading && !hasAnyResults && (
            <View style={s.emptyState}>
              <Text style={s.secondaryText}>
                No results for &ldquo;{searchText.trim()}&rdquo;
              </Text>
            </View>
          )}

          <GroupedCard style={{ marginTop: 16 }}>
            <Pressable
              style={({ pressed }) => [s.pickerRow, pressed && s.rowPressed]}
              onPress={() => onSelectCompany(searchText.trim(), '', 'Other', 0)}
            >
              <View style={s.manualAddCircle}>
                <Ionicons name="add" size={20} color="#007AFF" />
              </View>
              <View style={s.pickerTextCol}>
                <Text style={[s.pickerName, { color: '#007AFF' }]} numberOfLines={1}>
                  Add &ldquo;{searchText.trim()}&rdquo; manually
                </Text>
              </View>
            </Pressable>
          </GroupedCard>
        </>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

function PickerServiceRow({
  name,
  domain,
  subtitle,
  onPress,
}: {
  name: string;
  domain: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [s.pickerRow, pressed && s.rowPressed]}
      onPress={onPress}
    >
      <View style={s.logoCircle}>
        <CompanyLogo domain={domain} size={28} rounded={14} fallbackText={name} />
      </View>
      <View style={s.pickerTextCol}>
        <Text style={s.pickerName} numberOfLines={1}>{name}</Text>
        <Text style={s.pickerSubtitle} numberOfLines={1}>{subtitle}</Text>
      </View>
      <SFIcon name="chevron.right" size={13} color={colors.textSoft} weight="semibold" />
    </Pressable>
  );
}

/* ================================================================== */
/*  Details Body (full form)                                           */
/* ================================================================== */

type DetailsBodyProps = {
  companyName: string;
  domain: string;
  initialCategory: string;
  initialPrice: number;
  saveRef: React.MutableRefObject<(() => Promise<void>) | null>;
  onDismiss: () => void;
};

function DetailsBody({ companyName, domain, initialCategory, initialPrice, saveRef, onDismiss }: DetailsBodyProps) {
  const safeAreaInsets = useSafeAreaInsets();
  const layoutInsets = useMemo<EdgeInsets>(
    () => ({
      top: Math.max(safeAreaInsets.top, 12),
      bottom: Math.max(safeAreaInsets.bottom, 12),
      left: safeAreaInsets.left,
      right: safeAreaInsets.right,
    }),
    [safeAreaInsets],
  );

  const add = useSubscriptionsStore((s) => s.add);
  const savingRef = useRef(false);
  const priceRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);

  const [serviceName, setServiceName] = useState(companyName);
  const [price, setPrice] = useState(
    initialPrice > 0 ? (initialPrice % 1 === 0 ? String(initialPrice) : initialPrice.toFixed(2)) : '',
  );
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
  const [category, setCategory] = useState<string>(initialCategory || 'Other');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(1);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');

  const [sheet, setSheet] = useState<SheetType>(null);
  const [categorySearch, setCategorySearch] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);

  const categories = useMemo(() => [...BASE_CATEGORIES], []);
  const filteredCategories = useMemo(() => {
    const q = categorySearch.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.toLowerCase().includes(q));
  }, [categories, categorySearch]);

  useEffect(() => {
    const target = companyName ? priceRef : nameRef;
    const t = setTimeout(() => target.current?.focus(), 400);
    return () => clearTimeout(t);
  }, [companyName]);

  useEffect(() => {
    if (!subscriptionStartTouchedRef.current) {
      setSubscriptionStartDate(new Date(nextCharge.getTime()));
    }
  }, [nextCharge]);

  saveRef.current = async () => {
    if (savingRef.current) return;
    const numPrice = Number(price.replace(',', '.'));
    if (!serviceName.trim() || !Number.isFinite(numPrice) || numPrice <= 0) {
      Alert.alert('Missing info', 'Enter a service name and a valid price.');
      return;
    }
    savingRef.current = true;
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
    onDismiss();
  };

  async function handleReminderToggle(value: boolean) {
    if (!value) { setReminderEnabled(false); return; }
    const granted = await requestNotificationPermissions();
    if (!granted) {
      Alert.alert(
        'Enable notifications',
        'Allow notifications to receive upcoming charge reminders.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      setReminderEnabled(false);
      return;
    }
    setReminderEnabled(true);
  }

  const reminderLabel =
    reminderDays === 0
      ? 'Same day'
      : reminderDays === 7
        ? '1 week before'
        : `${reminderDays} day${reminderDays > 1 ? 's' : ''} before`;

  return (
    <>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        {/* ── Service + Price + Currency ────────────────── */}
        <GroupedCard style={{ marginTop: 16 }}>
          <View style={s.row}>
            {domain ? (
              <CompanyLogo domain={domain} size={40} rounded={12} fallbackText={serviceName} />
            ) : (
              <View style={s.monogramCircle}>
                <Text style={s.monogramText}>
                  {(serviceName[0] ?? '?').toUpperCase()}
                </Text>
              </View>
            )}
            <TextInput
              ref={nameRef}
              value={serviceName}
              onChangeText={setServiceName}
              placeholder="Service name"
              placeholderTextColor={IOS_SECONDARY}
              style={s.nameInput}
              autoCapitalize="words"
            />
          </View>
          <Sep />
          <CellRow
            label="Amount"
            right={
              <TextInput
                ref={priceRef}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={IOS_SECONDARY}
                keyboardType="decimal-pad"
                style={s.amountInput}
              />
            }
          />
          <Sep />
          <CellRow
            label="Currency"
            value={`${currency} (${CURRENCY_SYMBOLS[currency]})`}
            chevron
            onPress={() => setSheet('currency')}
          />
        </GroupedCard>

        {/* ── Schedule ──────────────────────────────────── */}
        <SectionHeader>Schedule</SectionHeader>
        <GroupedCard>
          <CellRow
            label="Payment date"
            value={nextCharge.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            chevron
            onPress={() => { void hapticSelection(); setShowDatePicker(true); }}
          />
          <Sep />
          <CellRow
            label="Subscription start"
            value={subscriptionStartDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            chevron
            onPress={() => { void hapticSelection(); setShowStartDatePicker(true); }}
          />
          <Sep />
          <CellRow
            label="Billing cycle"
            value={BILLING_CYCLE_LABELS[billingCycle]}
            chevron
            onPress={() => setSheet('billingCycle')}
          />
          <Sep />
          <CellRow
            label="Free trial"
            right={
              <Switch
                value={isTrial}
                onValueChange={setIsTrial}
                trackColor={{ false: '#D9D9D9', true: '#30CE5A' }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            }
          />
          {isTrial && (
            <>
              <Sep />
              <CellRow
                label="Trial length"
                value={TRIAL_LENGTH_LABELS[trialLength]}
                chevron
                onPress={() => setSheet('trialLength')}
              />
            </>
          )}
        </GroupedCard>

        {/* ── Organization ──────────────────────────────── */}
        <SectionHeader>Organization</SectionHeader>
        <GroupedCard>
          <CellRow label="List" value={list} chevron onPress={() => setSheet('list')} />
          <Sep />
          <CellRow label="Category" value={category} chevron onPress={() => setSheet('category')} />
          <Sep />
          <CellRow
            label="Payment method"
            value={paymentMethod || 'None'}
            chevron
            onPress={() => setSheet('paymentMethod')}
          />
        </GroupedCard>

        {/* ── Reminders ─────────────────────────────────── */}
        <SectionHeader>Reminders</SectionHeader>
        <GroupedCard>
          <CellRow
            label="Renewal reminders"
            sublabel="Get notified before renewals"
            right={
              <Switch
                value={reminderEnabled}
                onValueChange={handleReminderToggle}
                trackColor={{ false: '#D9D9D9', true: '#30CE5A' }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            }
          />
          {reminderEnabled && (
            <>
              <Sep />
              <CellRow
                label="Notify me"
                value={reminderLabel}
                chevron
                onPress={() => setSheet('notify')}
              />
              <Sep />
              <CellRow
                label="Time"
                value={reminderTime}
                chevron
                onPress={() => { void hapticSelection(); setShowReminderTimePicker(true); }}
              />
            </>
          )}
        </GroupedCard>

        {/* ── Additional ────────────────────────────────── */}
        <SectionHeader>Additional</SectionHeader>
        <GroupedCard>
          <CellRow
            label="Website"
            right={
              <TextInput
                value={url}
                onChangeText={setUrl}
                placeholder="e.g. netflix.com"
                placeholderTextColor={IOS_SECONDARY}
                style={s.inlineInput}
                autoCapitalize="none"
                autoCorrect={false}
              />
            }
          />
          <Sep />
          <View style={s.notesRow}>
            <Text style={s.primaryText}>Notes</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note…"
              placeholderTextColor={IOS_SECONDARY}
              style={s.notesInput}
              multiline
            />
          </View>
        </GroupedCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Action Sheets ───────────────────────────────── */}
      <AppActionSheet
        visible={sheet !== null}
        onClose={() => setSheet(null)}
        safeAreaInsets={layoutInsets}
        maxHeight={sheet === 'category' ? 9999 : undefined}
      >
        {sheet === 'currency' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Currency</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
              {ADD_SUBSCRIPTION_CURRENCIES.map((item) => (
                <SheetOption
                  key={item}
                  label={`${item} (${CURRENCY_SYMBOLS[item]})`}
                  selected={currency === item}
                  onPress={() => { setCurrency(item); setSheet(null); }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {sheet === 'billingCycle' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Billing Cycle</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
              {BILLING_CYCLE_OPTIONS.map((c) => (
                <SheetOption
                  key={c}
                  label={BILLING_CYCLE_LABELS[c]}
                  selected={billingCycle === c}
                  onPress={() => { setBillingCycle(c); setSheet(null); }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {sheet === 'list' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Select List</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
              {['Personal', 'Business'].map((item) => (
                <SheetOption
                  key={item}
                  label={item}
                  selected={list === item}
                  onPress={() => { setList(item); setSheet(null); }}
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
              placeholderTextColor={SHEET_DIM}
              style={s.sheetSearch}
            />
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
              {filteredCategories.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => {
                    void hapticSelection();
                    setCategory(item);
                    setSheet(null);
                  }}
                  style={({ pressed }) => [s.catOption, pressed && s.sheetPressed]}
                >
                  <View style={[s.catIconWrap, category === item && s.catIconWrapSelected]}>
                    <SFIcon
                      name={CATEGORY_ICONS[item] ?? 'ellipsis.circle'}
                      size={20}
                      color={category === item ? '#fff' : SHEET_INK}
                    />
                  </View>
                  <Text style={s.catOptionText}>{item}</Text>
                  {category === item && (
                    <SFIcon name="checkmark.circle.fill" size={18} color={SHEET_GREEN} style={{ marginLeft: 'auto' }} />
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
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
              {TRIAL_LENGTH_OPTIONS.map((opt) => (
                <SheetOption
                  key={opt}
                  label={TRIAL_LENGTH_LABELS[opt]}
                  selected={trialLength === opt}
                  onPress={() => { setTrialLength(opt); setSheet(null); }}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {sheet === 'notify' && (
          <View style={s.sheetRoot}>
            <Text style={s.sheetTitle}>Notification Settings</Text>
            <ScrollView style={s.sheetScroll} keyboardShouldPersistTaps="handled">
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
                    item.days === -1
                      ? ![0, 1, 3, 7].includes(reminderDays)
                      : reminderDays === item.days
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
                  <Text style={s.inlineEditorLabel}>Custom days before</Text>
                  <TextInput
                    value={String(reminderDays)}
                    onChangeText={(t) =>
                      setReminderDays(Math.max(1, Number(t.replace(/\D/g, '') || 1)))
                    }
                    keyboardType="number-pad"
                    style={s.sheetTextInput}
                  />
                </View>
              )}
            </ScrollView>
            <Pressable
              onPress={() => { void hapticSelection(); setSheet(null); }}
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
    </>
  );
}

/* ================================================================== */
/*  Reusable components — exact match with SettingsScreen              */
/* ================================================================== */

function GroupedCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.groupedCard, style]}>{children}</View>;
}

function SectionHeader({ children, first }: { children: string; first?: boolean }) {
  return <Text style={[s.sectionHeader, first && s.sectionHeaderFirst]}>{children}</Text>;
}

function Sep() {
  return <View style={s.sep} />;
}

function CellRow({
  label,
  sublabel,
  value,
  right,
  chevron,
  onPress,
}: {
  label: string;
  sublabel?: string;
  value?: string;
  right?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
}) {
  const inner = (
    <>
      <View style={s.cellLabelCol}>
        <Text style={s.primaryText}>{label}</Text>
        {sublabel ? <Text style={s.secondaryText}>{sublabel}</Text> : null}
      </View>
      <View style={s.cellRightCol}>
        {value ? <Text style={s.secondaryText}>{value}</Text> : null}
        {right}
        {chevron && (
          <SFIcon name="chevron.right" size={13} color={colors.textSoft} weight="semibold" />
        )}
      </View>
    </>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={() => { void hapticSelection(); onPress(); }}
        style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={s.row}>{inner}</View>;
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
      onPress={() => { void hapticSelection(); onPress(); }}
      style={({ pressed }) => [s.sheetOption, pressed && s.sheetPressed]}
    >
      <Text style={s.sheetOptionText}>{label}</Text>
      {selected ? (
        <SFIcon name="checkmark.circle.fill" size={18} color={SHEET_GREEN} />
      ) : (
        <Ionicons name="chevron-forward" size={14} color={SHEET_DIM} />
      )}
    </Pressable>
  );
}

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const s = StyleSheet.create({
  /* ── Shared layout ─────────────────────────────────── */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
    flexGrow: 1,
  },
  pickerContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    flexGrow: 1,
  },

  /* ── Grouped card (exact match SettingsScreen) ─────── */
  groupedCard: {
    backgroundColor: IOS_CARD_BG,
    borderRadius: 24,
    overflow: 'hidden',
  },

  /* ── Row (exact match SettingsScreen) ──────────────── */
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 10,
  },
  rowPressed: {
    backgroundColor: IOS_ROW_HIGHLIGHT,
  },
  cellLabelCol: { flex: 1, justifyContent: 'center', gap: 3 },
  cellRightCol: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  /* ── Typography (exact match SettingsScreen) ───────── */
  primaryText: { fontSize: 16, fontWeight: '600', color: IOS_PRIMARY },
  secondaryText: { fontSize: 14, fontWeight: '500', color: IOS_SECONDARY },

  /* ── Separator (exact match SettingsScreen) ────────── */
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: 20,
  },

  /* ── Section header (exact match SettingsScreen) ───── */
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: IOS_SECONDARY,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: spacing.sectionTitleToCard,
  },
  sectionHeaderFirst: {
    marginTop: 8,
  },

  /* ── Details form custom inputs ────────────────────── */
  monogramCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(11,8,3,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgba(11,8,3,0.65)',
  },
  nameInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: IOS_PRIMARY,
    paddingVertical: 0,
  },
  amountInput: {
    fontSize: 17,
    fontWeight: '600',
    color: IOS_PRIMARY,
    textAlign: 'right',
    minWidth: 100,
    paddingVertical: 0,
  },
  inlineInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: IOS_PRIMARY,
    textAlign: 'right',
    paddingVertical: 0,
  },
  notesRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  notesInput: {
    fontSize: 14,
    fontWeight: '400',
    color: IOS_PRIMARY,
    minHeight: 64,
    textAlignVertical: 'top',
    paddingVertical: 0,
  },
  /* ── Picker rows (match home page SubscriptionRow) ── */
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickerTextCol: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  pickerName: {
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    color: IOS_PRIMARY,
  },
  pickerSubtitle: {
    marginTop: 2,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '500',
    color: IOS_SECONDARY,
  },
  pickerSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: 86,
  },
  loadingState: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyState: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  manualAddCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,122,255,0.06)',
    borderWidth: 1.5,
    borderColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Header (Android fallback) ─────────────────────── */
  androidSaveButton: {
    backgroundColor: '#CB30E0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  androidSaveLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  /* ── Action sheet internals ────────────────────────── */
  sheetRoot: { flex: 1, minHeight: 0 },
  sheetScroll: { flex: 1, minHeight: 0 },
  sheetTitle: { ...sheetTypography.title },
  sheetPressed: { opacity: 0.75 },
  sheetOption: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: SHEET_BG,
    marginBottom: 8,
  },
  sheetOptionText: { ...sheetTypography.option },
  sheetSearch: {
    ...sheetTypography.search,
    borderRadius: 12,
    backgroundColor: SHEET_BG,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  inlineEditor: {
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: SHEET_BG,
    gap: 8,
  },
  inlineEditorLabel: { ...sheetTypography.inlineLabel },
  sheetTextInput: {
    borderRadius: 10,
    backgroundColor: SHEET_CARD,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: SHEET_INK,
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
  catIconWrapSelected: { backgroundColor: SHEET_GREEN },
  catOptionText: { fontSize: 15, fontWeight: '600', color: SHEET_INK },
  tagGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8 },
  tag: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: SHEET_CARD,
    borderWidth: 1,
    borderColor: SHEET_SEP,
  },
  tagSelected: { backgroundColor: SHEET_GREEN, borderColor: SHEET_GREEN },
  tagText: { fontSize: 14, fontWeight: '600', color: SHEET_INK },
  tagTextSelected: { color: '#FFFFFF' },
  sheetDoneBtn: {
    marginTop: 12,
    backgroundColor: SHEET_INK,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  sheetDoneText: { ...sheetTypography.done },
});
