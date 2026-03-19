import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CompanyLogo } from '../components/CompanyLogo';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { searchBrands, type BrandResult } from '../utils/brandSearch';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import type { Subscription } from '../features/subscriptions/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AddSubscription'>;

// ─── Design tokens (matches HomeScreen) ──────────────────────────────────────
const BG = '#F5F5F5';
const CARD = '#FFFFFF';
const INK = '#0B0803';
const DIM = 'rgba(11,8,3,0.5)';
const SEP = 'rgba(11,8,3,0.07)';
const GREEN = '#30CE5A';

// ─── Popular services catalogue ───────────────────────────────────────────────
type ServiceTemplate = { name: string; domain: string; category: Subscription['category'] };

const POPULAR: { section: string; items: ServiceTemplate[] }[] = [
  {
    section: 'Streaming',
    items: [
      { name: 'Netflix', domain: 'netflix.com', category: 'Streaming' },
      { name: 'YouTube Premium', domain: 'youtube.com', category: 'Streaming' },
      { name: 'Amazon Prime', domain: 'primevideo.com', category: 'Streaming' },
      { name: 'Disney+', domain: 'disneyplus.com', category: 'Streaming' },
      { name: 'Hulu', domain: 'hulu.com', category: 'Streaming' },
      { name: 'HBO Max', domain: 'hbomax.com', category: 'Streaming' },
      { name: 'Apple TV+', domain: 'apple.com', category: 'Streaming' },
    ],
  },
  {
    section: 'Music',
    items: [
      { name: 'Spotify', domain: 'spotify.com', category: 'Music' },
      { name: 'Apple Music', domain: 'apple.com', category: 'Music' },
      { name: 'Tidal', domain: 'tidal.com', category: 'Music' },
      { name: 'Deezer', domain: 'deezer.com', category: 'Music' },
    ],
  },
  {
    section: 'Productivity',
    items: [
      { name: 'ChatGPT Plus', domain: 'openai.com', category: 'Productivity' },
      { name: 'Notion', domain: 'notion.so', category: 'Productivity' },
      { name: 'Adobe Creative Cloud', domain: 'adobe.com', category: 'Productivity' },
      { name: 'Microsoft 365', domain: 'microsoft.com', category: 'Productivity' },
      { name: 'Slack', domain: 'slack.com', category: 'Productivity' },
      { name: 'Figma', domain: 'figma.com', category: 'Productivity' },
      { name: 'Dropbox', domain: 'dropbox.com', category: 'Productivity' },
    ],
  },
  {
    section: 'Cloud Storage',
    items: [
      { name: 'iCloud+', domain: 'apple.com', category: 'Cloud Storage' },
      { name: 'Google One', domain: 'google.com', category: 'Cloud Storage' },
      { name: 'OneDrive', domain: 'microsoft.com', category: 'Cloud Storage' },
    ],
  },
  {
    section: 'Gaming',
    items: [
      { name: 'Xbox Game Pass', domain: 'xbox.com', category: 'Gaming' },
      { name: 'PlayStation Plus', domain: 'playstation.com', category: 'Gaming' },
      { name: 'Apple Arcade', domain: 'apple.com', category: 'Gaming' },
      { name: 'Nintendo Switch Online', domain: 'nintendo.com', category: 'Gaming' },
    ],
  },
  {
    section: 'Fitness',
    items: [
      { name: 'Peloton', domain: 'onepeloton.com', category: 'Fitness' },
      { name: 'Strava', domain: 'strava.com', category: 'Fitness' },
      { name: 'Calm', domain: 'calm.com', category: 'Fitness' },
      { name: 'Headspace', domain: 'headspace.com', category: 'Fitness' },
    ],
  },
];

const CYCLE_OPTIONS: Subscription['billingCycle'][] = ['weekly', 'monthly', 'quarterly', 'yearly'];
const CYCLE_LABELS: Record<string, string> = {
  weekly: 'Every week',
  monthly: 'Every month',
  quarterly: 'Every 3 months',
  yearly: 'Every year',
};
const CURRENCIES: Array<'USD' | 'EUR' | 'GEL'> = ['USD', 'EUR', 'GEL'];
const CURRENCY_SYMBOLS: Record<string, string> = { USD: '$', EUR: '€', GEL: '₾' };
const CATEGORIES: Subscription['category'][] = [
  'Streaming', 'Music', 'Productivity', 'Cloud Storage', 'Gaming', 'Fitness', 'Education', 'Utilities', 'Other',
];

export function AddSubscriptionScreen({ navigation }: Props) {
  const add = useSubscriptionsStore((s) => s.add);

  const [step, setStep] = useState<'picker' | 'form'>('picker');
  const [search, setSearch] = useState('');
  const [apiResults, setApiResults] = useState<BrandResult[]>([]);
  const [apiLoading, setApiLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [serviceName, setServiceName] = useState('');
  const [domain, setDomain] = useState('');
  const [category, setCategory] = useState<Subscription['category']>('Other');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'EUR' | 'GEL'>('USD');
  const [billingCycle, setBillingCycle] = useState<Subscription['billingCycle']>('monthly');
  const [nextCharge, setNextCharge] = useState<Date>(() => {
    const d = new Date(); d.setDate(d.getDate() + 30); return d;
  });
  const [isTrial, setIsTrial] = useState(false);
  const [list, setList] = useState('Personal');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderDays, setReminderDays] = useState(1);
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Debounced brand search — fires 350 ms after user stops typing
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = search.trim();
    if (!q) {
      setApiResults([]);
      setApiLoading(false);
      return;
    }
    setApiLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchBrands(q);
      setApiResults(results);
      setApiLoading(false);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  // Local filter of popular services (only when no API results)
  const filteredPopular = useMemo(() => {
    if (search.trim()) return [];
    return POPULAR;
  }, [search]);

  function selectService(t: ServiceTemplate | BrandResult) {
    Haptics.selectionAsync();
    setServiceName(t.name);
    setDomain(t.domain);
    setCategory('category' in t ? t.category : 'Other');
    setStep('form');
  }

  function startCustom() {
    Haptics.selectionAsync();
    setServiceName(search.trim() ? search.trim() : '');
    setDomain('');
    setCategory('Other');
    setStep('form');
  }

  function handleSave() {
    const numPrice = Number(price.replace(',', '.'));
    if (!serviceName.trim() || !Number.isFinite(numPrice) || numPrice <= 0) {
      Alert.alert('Missing info', 'Enter a service name and a valid price.');
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    add({
      serviceName: serviceName.trim(),
      domain: domain.trim() || undefined,
      category,
      price: numPrice,
      currency,
      billingCycle,
      nextChargeDate: nextCharge.toISOString(),
      isTrial,
      list,
      paymentMethod: paymentMethod.trim() || undefined,
      reminderEnabled,
      reminderDaysBefore: reminderDays,
      url: url.trim() || undefined,
      description: notes.trim() || undefined,
      status: isTrial ? 'trial' : 'active',
    });
    navigation.goBack();
  }

  // ── Service Picker ────────────────────────────────────────────────────────
  if (step === 'picker') {
    const hasQuery = search.trim().length > 0;

    return (
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
        {/* Nav */}
        <View style={s.navBar}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [s.navCancelBtn, pressed && s.pressed]}>
            <Text style={s.navCancelText}>Cancel</Text>
          </Pressable>
          <Text style={s.navTitle}>Add Subscription</Text>
          <View style={{ width: 70 }} />
        </View>

        {/* Search bar — always at top */}
        <View style={s.searchTopWrap}>
          <View style={s.searchBar}>
            {apiLoading
              ? <ActivityIndicator size="small" color={DIM} style={{ marginRight: 8 }} />
              : <Ionicons name="search" size={16} color={DIM} style={{ marginRight: 8 }} />
            }
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search any brand or service…"
              placeholderTextColor={DIM}
              style={s.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {search.length > 0 && (
              <Pressable onPress={() => setSearch('')} hitSlop={8}>
                <Ionicons name="close-circle" size={16} color={DIM} />
              </Pressable>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {/* ── Brand Search results ─────────────────────────────────────── */}
          {hasQuery && (
            <>
              {apiLoading && apiResults.length === 0 ? (
                <View style={{ paddingTop: 48, alignItems: 'center' }}>
                  <ActivityIndicator size="large" color={DIM} />
                </View>
              ) : apiResults.length > 0 ? (
                <>
                  <Text style={s.sectionLabel}>Results</Text>
                  <View style={[s.card, { marginHorizontal: 16 }]}>
                    {apiResults.map((item, idx) => (
                      <View key={item.domain + idx}>
                        {idx !== 0 && <View style={[s.sep, { marginLeft: 62 }]} />}
                        <Pressable
                          onPress={() => selectService(item)}
                          style={({ pressed }) => [s.serviceRow, pressed && s.pressed]}
                        >
                          <CompanyLogo domain={item.domain} size={36} rounded={10} fallbackText={item.name} />
                          <View style={{ flex: 1 }}>
                            <Text style={s.serviceRowText}>{item.name}</Text>
                            <Text style={s.serviceRowDomain}>{item.domain}</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="rgba(11,8,3,0.25)" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingTop: 40 }}>
                  <Text style={{ fontSize: 15, color: DIM, marginBottom: 4 }}>No results for "{search}"</Text>
                </View>
              )}

              {/* Always show "Add as custom" when user is searching */}
              <Text style={s.sectionLabel}>Custom</Text>
              <View style={[s.card, { marginHorizontal: 16 }]}>
                <PickerAction
                  icon="add-circle-outline"
                  label={`Add "${search.trim()}" manually`}
                  sublabel="Set your own logo, price, and details"
                  onPress={startCustom}
                />
              </View>
            </>
          )}

          {/* ── Default view: Quick actions + Popular list ───────────────── */}
          {!hasQuery && (
            <>
              <View style={[s.card, { marginTop: 16, marginHorizontal: 16 }]}>
                <PickerAction
                  icon="image-outline"
                  label="Import from photos"
                  sublabel="Receipt, bill or renewal screenshots"
                  locked
                />
                <View style={s.sep} />
                <PickerAction
                  icon="document-text-outline"
                  label="Import a file"
                  sublabel="Bank statement or spreadsheet (PDF or CSV)"
                  locked
                />
                <View style={s.sep} />
                <PickerAction
                  icon="add-circle-outline"
                  label="Custom subscription"
                  onPress={startCustom}
                />
              </View>

              {filteredPopular.map((group) => (
                <View key={group.section}>
                  <Text style={s.sectionLabel}>{group.section}</Text>
                  <View style={[s.card, { marginHorizontal: 16 }]}>
                    {group.items.map((item, idx) => (
                      <View key={item.name}>
                        {idx !== 0 && <View style={[s.sep, { marginLeft: 62 }]} />}
                        <Pressable
                          onPress={() => selectService(item)}
                          style={({ pressed }) => [s.serviceRow, pressed && s.pressed]}
                        >
                          <CompanyLogo domain={item.domain} size={36} rounded={10} fallbackText={item.name} />
                          <Text style={s.serviceRowText}>{item.name}</Text>
                          <Ionicons name="chevron-forward" size={16} color="rgba(11,8,3,0.25)" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={s.navBar}>
          <Pressable onPress={() => setStep('picker')} style={({ pressed }) => [s.navBackBtn, pressed && s.pressed]}>
            <Ionicons name="chevron-back" size={20} color={INK} />
          </Pressable>
          <Text style={s.navTitle}>Add Subscription</Text>
          <Pressable onPress={handleSave} style={({ pressed }) => [s.saveBtn, pressed && s.pressed]}>
            <Text style={s.saveBtnText}>Save</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Hero preview */}
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

          {/* Notifications */}
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

// ─── Sub-components ────────────────────────────────────────────────────────────

function PickerAction({
  icon,
  label,
  sublabel,
  locked,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  locked?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={locked ? undefined : onPress}
      style={({ pressed }) => [s.actionRow, !locked && pressed && s.pressed]}
    >
      <View style={s.actionIcon}>
        <Ionicons name={icon} size={20} color={INK} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.actionLabel}>{label}</Text>
        {sublabel ? <Text style={s.actionSublabel}>{sublabel}</Text> : null}
      </View>
      {locked
        ? <Ionicons name="lock-closed" size={14} color="rgba(11,8,3,0.2)" />
        : <Ionicons name="chevron-forward" size={16} color="rgba(11,8,3,0.25)" />
      }
    </Pressable>
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

// ─── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  pressed: { opacity: 0.75 },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: SEP,
    backgroundColor: BG,
  },
  navCancelBtn: { width: 70 },
  navCancelText: { fontSize: 16, color: INK, fontWeight: '400' },
  navBackBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: CARD, alignItems: 'center', justifyContent: 'center',
  },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: INK },
  saveBtn: {
    paddingVertical: 8, paddingHorizontal: 16,
    borderRadius: 20, backgroundColor: INK,
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: DIM,
    marginTop: 20, marginBottom: 8, marginHorizontal: 16,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  card: { backgroundColor: CARD, borderRadius: 22 },
  sep: { height: 1, backgroundColor: SEP, marginHorizontal: 16 },

  // Picker
  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  actionIcon: {
    width: 38, height: 38, borderRadius: 11,
    backgroundColor: BG, alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { fontSize: 15, fontWeight: '600', color: INK },
  actionSublabel: { fontSize: 12, color: DIM, marginTop: 2 },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 14,
  },
  serviceRowText: { flex: 1, fontSize: 15, fontWeight: '500', color: INK },

  // Search bar — pinned at top below nav
  searchTopWrap: {
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6,
    backgroundColor: BG,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: CARD, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 11,
  },
  searchInput: { flex: 1, fontSize: 15, color: INK },
  serviceRowDomain: { fontSize: 12, color: DIM, marginTop: 1 },

  // Hero card
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

  // Form rows
  formRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  formRowLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: INK },
  formRowRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  datePill: {
    paddingVertical: 6, paddingHorizontal: 12,
    backgroundColor: BG, borderRadius: 10,
  },
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
