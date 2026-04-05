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
  Text,
  TextInput,
  View,
} from 'react-native';
import { SFIcon } from '../components/SFIcon';
import { CompanyLogo } from '../components/CompanyLogo';
import { hapticImpactMedium } from '../ui/haptics';
import { toLocalDateString } from '../features/subscriptions/buildBillingHistoryFromSubscription';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { requestNotificationPermissions } from '../features/notifications/service';
import { searchBrands, type BrandResult } from '../utils/brandSearch';
import { colors, figma, spacing } from '../ui/theme';
import type { Subscription } from '../features/subscriptions/types';
import {
  BILLING_CYCLE_OPTIONS,
  POPULAR_SERVICES_BY_SECTION,
  type ServiceTemplate,
} from '../features/subscriptions/addSubscriptionCatalog';
import { SubscriptionDetailsForm, type TrialLengthDays } from '../features/subscriptions/SubscriptionDetailsForm';

/* ------------------------------------------------------------------ */
/*  iOS dynamic colors — exact match with SettingsScreen               */
/* ------------------------------------------------------------------ */

const iosDynamic = (light: string, dark: string, fallback: string = light) =>
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : fallback;

/** Matches app accent; `UIBarButtonItem.Style.prominent` only applies on iOS 26+ (see RNSBarButtonItem). */
const SAVE_HEADER_PURPLE = '#CB30E0';

function iosMajorVersion(): number {
  if (Platform.OS !== 'ios') return 0;
  const v = Platform.Version;
  const s = typeof v === 'number' ? String(v) : v;
  return parseInt(s.split('.')[0] ?? '0', 10) || 0;
}

const IOS_USE_PROMINENT_SAVE_BUTTON = iosMajorVersion() >= 26;

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

const androidTextFix =
  Platform.OS === 'android' ? ({ includeFontPadding: false } as const) : {};

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

/* ------------------------------------------------------------------ */
/*  Catalog constants                                                  */
/* ------------------------------------------------------------------ */

function formatStartingPrice(price: number): string {
  const formatted = price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
  return `${formatted}/m`;
}

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
                  variant: IOS_USE_PROMINENT_SAVE_BUTTON ? 'prominent' : 'done',
                  tintColor: SAVE_HEADER_PURPLE,
                  labelStyle: IOS_USE_PROMINENT_SAVE_BUTTON
                    ? { fontWeight: '600', color: '#FFFFFF' }
                    : { fontWeight: '600' },
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
  const [customCycleDays, setCustomCycleDays] = useState(30);
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
  const [trialLengthDays, setTrialLengthDays] = useState<TrialLengthDays>(7);
  const [list, setList] = useState('Personal');
  const [category, setCategory] = useState<string>(initialCategory || 'Other');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(1);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [notes, setNotes] = useState('');

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

    let effectiveNextCharge = nextCharge;
    if (isTrial) {
      const trialEnd = new Date(subscriptionStartDate.getTime());
      trialEnd.setDate(trialEnd.getDate() + trialLengthDays);
      effectiveNextCharge = trialEnd;
    }

    await add({
      serviceName: serviceName.trim(),
      domain: domain.trim() || undefined,
      category: (category as Subscription['category']) ?? 'Other',
      price: numPrice,
      currency,
      billingCycle,
      subscriptionStartDate: toLocalDateString(subscriptionStartDate),
      nextChargeDate: effectiveNextCharge.toISOString(),
      isTrial,
      trialLengthDays: isTrial ? trialLengthDays : null,
      list,
      paymentMethod: paymentMethod.trim() || undefined,
      reminderEnabled,
      reminderDaysBefore: reminderDays,
      reminderTime,
      description: notes.trim() || undefined,
      status: isTrial ? 'trial' : 'active',
    });
    onDismiss();
  };

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
        ],
      );
      setReminderEnabled(false);
      return;
    }
    setReminderEnabled(true);
  }

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.detailsScrollContent}
      contentInsetAdjustmentBehavior="scrollableAxes"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      <SubscriptionDetailsForm
        nameRef={nameRef}
        priceRef={priceRef}
        serviceName={serviceName}
        onServiceNameChange={setServiceName}
        domain={domain}
        price={price}
        onPriceChange={setPrice}
        currency={currency}
        onCurrencyChange={setCurrency}
        billingCycle={billingCycle}
        onBillingCycleChange={setBillingCycle}
        billingCycleMenuIds={BILLING_CYCLE_OPTIONS}
        category={category}
        onCategoryChange={setCategory}
        customCycleDays={customCycleDays}
        onCustomCycleDaysChange={setCustomCycleDays}
        nextCharge={nextCharge}
        onNextChargeChange={setNextCharge}
        subscriptionStartDate={subscriptionStartDate}
        onSubscriptionStartDateChange={setSubscriptionStartDate}
        subscriptionStartTouchedRef={subscriptionStartTouchedRef}
        isTrial={isTrial}
        onIsTrialChange={setIsTrial}
        trialLengthDays={trialLengthDays}
        onTrialLengthDaysChange={setTrialLengthDays}
        list={list}
        onListChange={setList}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        reminderEnabled={reminderEnabled}
        onReminderToggle={handleReminderToggle}
        reminderDays={reminderDays}
        onReminderDaysChange={setReminderDays}
        reminderTime={reminderTime}
        onReminderTimeChange={setReminderTime}
        notes={notes}
        onNotesChange={setNotes}
      />
    </ScrollView>
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

/* ================================================================== */
/*  Styles                                                             */
/* ================================================================== */

const s = StyleSheet.create({
  /* ── Shared layout ─────────────────────────────────── */
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: spacing.screenX,
    paddingTop: 4,
    paddingBottom: 40,
    flexGrow: 1,
  },
  detailsScrollContent: {
    paddingHorizontal: figma.subscriptions273.cardInsetX,
    paddingTop: 4,
    paddingBottom: 200,
  },
  /**
   * Logical hero group (no card chrome): 16px between title, price, chip row, trial; 24px bottom before Amount.
   */
  heroCard: {
    alignSelf: 'stretch',
    gap: 16,
    paddingBottom: 24,
  },
  /**
   * Bleed past detailsScroll `cardInsetX` so the chip track is full screen width; content
   * insets use `contentPaddingX` (36) so the first chip matches the big title column.
   */
  heroChipsScroll: {
    alignSelf: 'stretch',
    minHeight: 48,
    marginHorizontal: -figma.subscriptions273.cardInsetX,
  },
  heroChipsScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: figma.subscriptions273.contentPaddingX,
    paddingRight: figma.subscriptions273.contentPaddingX,
  },
  heroChipWrap: {
    flexShrink: 0,
  },
  heroChipPill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 30,
    borderWidth: 0,
    backgroundColor: IOS_CARD_BG,
  },
  heroChipPillInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroChipPillText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
    color: '#616161',
    ...androidTextFix,
  },
  /** Matches SubscriptionsScreen `figmaTextColumn`: 16 + 20 = 36px from screen edge for hero copy */
  heroTextColumn: {
    paddingHorizontal: figma.subscriptions273.textColumnGutterX,
    alignSelf: 'stretch',
  },
  collapsed: {
    height: 0,
    overflow: 'hidden' as const,
    opacity: 0,
  },
  pickerContent: {
    paddingHorizontal: spacing.screenX,
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
  secondaryText: { fontSize: 16, fontWeight: '500', color: IOS_SECONDARY },

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

  /** Logo → title+price block (24); title ↔ price use `heroTitlePrice` */
  heroStack: {
    alignItems: 'flex-start',
    alignSelf: 'stretch',
    gap: 24,
  },
  heroTitlePrice: {
    alignSelf: 'stretch',
    gap: 16,
  },
  heroLogoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  heroFallbackText: {
    fontSize: 24,
    fontWeight: '800',
    color: IOS_PRIMARY,
  },
  heroNameInput: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 34,
    lineHeight: 42,
    color: '#000',
    textAlign: 'left',
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 42,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  heroPrice: {
    fontSize: 20,
    fontWeight: '600',
    color: IOS_PRIMARY,
    textAlign: 'left',
    alignSelf: 'stretch',
  },
  heroSub: {
    fontSize: 16,
    fontWeight: '500',
    color: IOS_SECONDARY,
    textAlign: 'left',
    alignSelf: 'stretch',
  },

  /* ── Details form custom inputs ────────────────────── */
  amountInput: {
    fontSize: 17,
    fontWeight: '600',
    color: IOS_PRIMARY,
    textAlign: 'right',
    minWidth: 100,
    paddingVertical: 0,
  },
  nativeNotesInput: {
    fontSize: 16,
    fontWeight: '400',
    color: IOS_PRIMARY,
    minHeight: 88,
    paddingHorizontal: 20,
    paddingVertical: 16,
    textAlignVertical: 'top',
  },
  /* ── Picker rows (match home page SubscriptionRow) ── */
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: spacing.screenX,
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
    fontSize: 16,
    lineHeight: 21,
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
    backgroundColor: SAVE_HEADER_PURPLE,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  androidSaveLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

});
