import React from 'react';
import { MenuView } from '@react-native-menu/menu';
import {
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AppDateTimePicker } from '../../components/AppDateTimePicker';
import { SFIcon } from '../../components/SFIcon';
import { CompanyLogo } from '../../components/CompanyLogo';
import { hapticSelection } from '../../ui/haptics';
import { colors } from '../../ui/theme';
import type { BillingCycle, CurrencyCode, Subscription, SubscriptionStatus } from './types';
import { formatAmountDigits, formatMoney } from './calc';
import {
  ADD_SUBSCRIPTION_CURRENCIES,
  BASE_CATEGORIES,
  BILLING_CYCLE_LABELS,
  BILLING_CYCLE_SHORT_LABELS,
  CURRENCY_SYMBOLS,
} from './addSubscriptionCatalog';
import { IOS_SECONDARY, subscriptionFormStyles as s } from './subscriptionDetailsFormStyles';

export const TRIAL_LENGTH_OPTIONS = [3, 7, 14, 30] as const;
export type TrialLengthDays = (typeof TRIAL_LENGTH_OPTIONS)[number];
export const TRIAL_LENGTH_LABELS: Record<number, string> = {
  3: '3 Days',
  7: '7 Days',
  14: '14 Days',
  30: '30 Days',
};

const PAYMENT_METHODS = [
  'Cash', 'Credit Card', 'Debit Card',
  'PayPal', 'Google Pay', 'Apple Pay',
  'Stripe', 'Bank Transfer', 'Crypto',
  'AliPay', 'WeChat', 'SEPA', 'Klarna',
  'Venmo', 'Interac',
];

const CYCLE_SHORT: Record<string, string> = {
  weekly: 'wk',
  monthly: 'mo',
  quarterly: 'qtr',
  yearly: 'yr',
  custom: 'custom',
};

function cycleShort(c: string): string {
  return CYCLE_SHORT[c] ?? c;
}

function heroCycleDisplay(cycle: BillingCycle, customCycleDays?: number): string {
  if (cycle === 'custom') {
    return customCycleDays != null && customCycleDays > 0 ? `${customCycleDays}d` : 'custom';
  }
  return cycleShort(cycle);
}

export function parseTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h! : 9, Number.isFinite(m) ? m! : 0, 0, 0);
  return d;
}

function heroCurrencyLabel(c: CurrencyCode): string {
  return c;
}

function heroBillingLabel(cycle: BillingCycle): string {
  return BILLING_CYCLE_SHORT_LABELS[cycle];
}

/** Logo.dev / monogram size inside `heroLogoCircle` (84×84 container). */
export const HERO_SMALL_LOGO_SIZE = 48;

export type SubscriptionDetailsFormProps = {
  nameRef: React.RefObject<TextInput | null>;
  priceRef: React.RefObject<TextInput | null>;
  serviceName: string;
  onServiceNameChange: (v: string) => void;
  domain?: string;
  price: string;
  onPriceChange: (v: string) => void;
  currency: CurrencyCode;
  onCurrencyChange: (c: CurrencyCode) => void;
  billingCycle: BillingCycle;
  onBillingCycleChange: (c: BillingCycle) => void;
  /** e.g. `BILLING_CYCLE_OPTIONS` or include `custom` for edit */
  billingCycleMenuIds: Subscription['billingCycle'][];
  category: string;
  onCategoryChange: (c: string) => void;
  customCycleDays: number;
  onCustomCycleDaysChange: (n: number) => void;
  nextCharge: Date;
  onNextChargeChange: (d: Date) => void;
  subscriptionStartDate: Date;
  onSubscriptionStartDateChange: (d: Date) => void;
  subscriptionStartTouchedRef: React.MutableRefObject<boolean>;
  /** When set, marked true if the user changes the payment date (add flow auto-sync). */
  nextChargeTouchedRef?: React.MutableRefObject<boolean>;
  isTrial: boolean;
  onIsTrialChange: (v: boolean) => void;
  trialLengthDays: TrialLengthDays;
  onTrialLengthDaysChange: (d: TrialLengthDays) => void;
  list: string;
  onListChange: (v: string) => void;
  paymentMethod: string;
  onPaymentMethodChange: (v: string) => void;
  reminderEnabled: boolean;
  onReminderToggle: (v: boolean) => void | Promise<void>;
  reminderDays: number;
  onReminderDaysChange: (n: number) => void;
  reminderTime: string;
  onReminderTimeChange: (t: string) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  url?: string;
  onUrlChange?: (v: string) => void;
};

export function SubscriptionDetailsForm(p: SubscriptionDetailsFormProps) {
  const reminderLabel =
    p.reminderDays === 0
      ? 'Same day'
      : p.reminderDays === 7
        ? '1 week before'
        : `${p.reminderDays} day${p.reminderDays > 1 ? 's' : ''} before`;

  const sym = CURRENCY_SYMBOLS[p.currency];
  const priceNum = Number(String(p.price).replace(',', '.'));
  const heroDigits =
    Number.isFinite(priceNum) && priceNum !== 0
      ? formatAmountDigits(priceNum)
      : p.price.trim() || '0.00';
  const heroPriceDisplay = `${sym}${heroDigits}`;

  return (
    <>
      <View style={s.heroCard}>
        <View style={s.heroTextColumn}>
          <View style={s.heroStack}>
            <View style={s.heroLogoCircle}>
              {p.domain ? (
                <CompanyLogo
                  domain={p.domain}
                  size={HERO_SMALL_LOGO_SIZE}
                  rounded={24}
                  fallbackText={p.serviceName}
                />
              ) : (
                <Text style={s.heroFallbackText}>{(p.serviceName[0] ?? '?').toUpperCase()}</Text>
              )}
            </View>
            <View style={s.heroTitlePrice}>
              <TextInput
                ref={p.nameRef}
                value={p.serviceName}
                onChangeText={(t) => p.onServiceNameChange(t.replace(/\n/g, ' '))}
                placeholder="Service name"
                placeholderTextColor={IOS_SECONDARY}
                style={s.heroNameInput}
                autoCapitalize="words"
                textAlign="left"
                multiline
                scrollEnabled={false}
                {...(Platform.OS === 'android' ? { textAlignVertical: 'top' as const } : {})}
              />
              <Text style={s.heroPrice}>
                {heroPriceDisplay} / {heroCycleDisplay(p.billingCycle, p.customCycleDays)}
              </Text>
            </View>
          </View>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.heroChipsScroll}
          contentContainerStyle={s.heroChipsScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <MenuView
            shouldOpenOnLongPress={false}
            actions={p.billingCycleMenuIds.map((c) => ({
              id: c,
              title: BILLING_CYCLE_LABELS[c],
              state: p.billingCycle === c ? ('on' as const) : ('off' as const),
            }))}
            onPressAction={({ nativeEvent }) => {
              void hapticSelection();
              p.onBillingCycleChange(nativeEvent.event as BillingCycle);
            }}
          >
            <View style={s.heroChipWrap}>
              <View style={s.heroChipPill}>
                <View style={s.heroChipPillInner}>
                  <Text style={s.heroChipPillText} numberOfLines={1}>
                    {heroBillingLabel(p.billingCycle)}
                  </Text>
                  <SFIcon name="chevron.down" size={13} color={colors.textMuted} weight="semibold" />
                </View>
              </View>
            </View>
          </MenuView>
          <MenuView
            shouldOpenOnLongPress={false}
            actions={BASE_CATEGORIES.map((c) => ({
              id: c,
              title: c,
              state: p.category === c ? ('on' as const) : ('off' as const),
            }))}
            onPressAction={({ nativeEvent }) => {
              void hapticSelection();
              p.onCategoryChange(nativeEvent.event);
            }}
          >
            <View style={s.heroChipWrap}>
              <View style={s.heroChipPill}>
                <View style={s.heroChipPillInner}>
                  <Text style={s.heroChipPillText} numberOfLines={1}>
                    {p.category}
                  </Text>
                  <SFIcon name="chevron.down" size={13} color={colors.textMuted} weight="semibold" />
                </View>
              </View>
            </View>
          </MenuView>
        </ScrollView>
        {p.isTrial ? (
          <View style={s.heroTextColumn}>
            <Text style={s.heroSub}>Trial · {p.trialLengthDays} days</Text>
          </View>
        ) : null}
      </View>

      <GroupedCard>
        <CellRow
          label="Amount"
          right={
            <TextInput
              ref={p.priceRef}
              value={p.price ? `${sym} ${p.price}` : ''}
              onChangeText={(t) => p.onPriceChange(t.replace(/[^0-9.,]/g, ''))}
              placeholder={`${sym} 0.00`}
              placeholderTextColor={IOS_SECONDARY}
              keyboardType="decimal-pad"
              style={s.amountInput}
            />
          }
        />
        <Sep />
        <MenuView
          shouldOpenOnLongPress={false}
          actions={ADD_SUBSCRIPTION_CURRENCIES.map((c) => ({
            id: c,
            title: heroCurrencyLabel(c),
            state: p.currency === c ? ('on' as const) : ('off' as const),
          }))}
          onPressAction={({ nativeEvent }) => {
            void hapticSelection();
            p.onCurrencyChange(nativeEvent.event as CurrencyCode);
          }}
        >
          <CellRow label="Currency" value={heroCurrencyLabel(p.currency)} chevron />
        </MenuView>
      </GroupedCard>

      <SectionHeader>Schedule</SectionHeader>
      <GroupedCard>
        <CellRow
          label="Payment date"
          right={
            <AppDateTimePicker
              value={p.nextCharge}
              mode="date"
              display="compact"
              onChange={(_, selected) => {
                if (selected) {
                  if (p.nextChargeTouchedRef) p.nextChargeTouchedRef.current = true;
                  p.onNextChargeChange(selected);
                }
              }}
            />
          }
        />
        <Sep />
        <CellRow
          label="Subscription start"
          right={
            <AppDateTimePicker
              value={p.subscriptionStartDate}
              mode="date"
              display="compact"
              onChange={(_, selected) => {
                if (selected) {
                  p.subscriptionStartTouchedRef.current = true;
                  p.onSubscriptionStartDateChange(selected);
                }
              }}
            />
          }
        />
        <Sep />
        <CellRow
          label="Free trial"
          right={
            <Switch
              value={p.isTrial}
              onValueChange={p.onIsTrialChange}
              trackColor={{ false: '#D9D9D9', true: '#30CE5A' }}
              thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
            />
          }
        />
        <View style={p.isTrial ? undefined : s.collapsed}>
          <Sep />
          <MenuView
            shouldOpenOnLongPress={false}
            actions={TRIAL_LENGTH_OPTIONS.map((opt) => ({
              id: String(opt),
              title: TRIAL_LENGTH_LABELS[opt],
              state: p.trialLengthDays === opt ? ('on' as const) : ('off' as const),
            }))}
            onPressAction={({ nativeEvent }) => {
              void hapticSelection();
              p.onTrialLengthDaysChange(Number(nativeEvent.event) as TrialLengthDays);
            }}
          >
            <CellRow label="Trial length" value={TRIAL_LENGTH_LABELS[p.trialLengthDays]} chevron />
          </MenuView>
        </View>
        {p.billingCycle === 'custom' ? (
          <>
            <Sep />
            <CellRow
              label="Custom interval (days)"
              right={
                <TextInput
                  value={String(p.customCycleDays)}
                  onChangeText={(t) =>
                    p.onCustomCycleDaysChange(Math.max(1, Number(t.replace(/\D/g, '') || 1)))
                  }
                  keyboardType="number-pad"
                  style={s.customCycleInput}
                />
              }
            />
          </>
        ) : null}
      </GroupedCard>

      <SectionHeader>Organization</SectionHeader>
      <GroupedCard>
        <MenuView
          shouldOpenOnLongPress={false}
          actions={['Personal', 'Business'].map((item) => ({
            id: item,
            title: item,
            state: p.list === item ? ('on' as const) : ('off' as const),
          }))}
          onPressAction={({ nativeEvent }) => {
            void hapticSelection();
            p.onListChange(nativeEvent.event);
          }}
        >
          <CellRow label="List" value={p.list} chevron />
        </MenuView>
        <Sep />
        <MenuView
          shouldOpenOnLongPress={false}
          actions={[
            { id: '', title: 'None', state: p.paymentMethod === '' ? ('on' as const) : ('off' as const) },
            ...PAYMENT_METHODS.map((m) => ({
              id: m,
              title: m,
              state: p.paymentMethod === m ? ('on' as const) : ('off' as const),
            })),
          ]}
          onPressAction={({ nativeEvent }) => {
            void hapticSelection();
            p.onPaymentMethodChange(nativeEvent.event);
          }}
        >
          <CellRow label="Payment method" value={p.paymentMethod || 'None'} chevron />
        </MenuView>
      </GroupedCard>

      <SectionHeader>Reminders</SectionHeader>
      <GroupedCard>
        <CellRow
          label="Renewal reminders"
          sublabel={p.isTrial ? 'Get notified before trial ends' : 'Get notified before renewals'}
          right={
            <Switch
              value={p.reminderEnabled}
              onValueChange={(v) => {
                void p.onReminderToggle(v);
              }}
              trackColor={{ false: '#D9D9D9', true: '#30CE5A' }}
              thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
            />
          }
        />
        <View style={p.reminderEnabled ? undefined : s.collapsed}>
          <Sep />
          <MenuView
            shouldOpenOnLongPress={false}
            actions={[
              { id: '0', title: 'Same day', state: p.reminderDays === 0 ? ('on' as const) : ('off' as const) },
              { id: '1', title: '1 day before', state: p.reminderDays === 1 ? ('on' as const) : ('off' as const) },
              { id: '3', title: '3 days before', state: p.reminderDays === 3 ? ('on' as const) : ('off' as const) },
              { id: '7', title: '1 week before', state: p.reminderDays === 7 ? ('on' as const) : ('off' as const) },
            ]}
            onPressAction={({ nativeEvent }) => {
              void hapticSelection();
              p.onReminderDaysChange(Number(nativeEvent.event));
            }}
          >
            <CellRow label="Notify me" value={reminderLabel} chevron />
          </MenuView>
          <Sep />
          <CellRow
            label="Time"
            right={
              <AppDateTimePicker
                value={parseTime(p.reminderTime)}
                mode="time"
                display="compact"
                onChange={(_, selected) => {
                  if (selected) {
                    const hh = String(selected.getHours()).padStart(2, '0');
                    const mm = String(selected.getMinutes()).padStart(2, '0');
                    p.onReminderTimeChange(`${hh}:${mm}`);
                  }
                }}
              />
            }
          />
        </View>
      </GroupedCard>

      {p.onUrlChange ? (
        <>
          <SectionHeader>Website</SectionHeader>
          <GroupedCard>
            <TextInput
              value={p.url ?? ''}
              onChangeText={p.onUrlChange}
              placeholder="e.g. netflix.com"
              placeholderTextColor={IOS_SECONDARY}
              style={s.urlInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </GroupedCard>
        </>
      ) : null}

      <SectionHeader>Notes</SectionHeader>
      <GroupedCard>
        <TextInput
          value={p.notes}
          onChangeText={p.onNotesChange}
          placeholder="Add a note…"
          placeholderTextColor={IOS_SECONDARY}
          style={s.nativeNotesInput}
          multiline
          scrollEnabled={false}
        />
      </GroupedCard>
    </>
  );
}

/** Solid fill + white label for status chip in read-only hero (matches chip size, inverted from default badge). */
function readOnlyHeroStatusPill(status: SubscriptionStatus | string): { label: string; bg: string } {
  const map: Record<string, { label: string; bg: string }> = {
    active: { label: 'Active', bg: '#1B8A3C' },
    trial: { label: 'Trial', bg: '#6B3FBC' },
    paused: { label: 'Paused', bg: '#C2410C' },
    cancelled: { label: 'Cancelled', bg: '#6B7280' },
  };
  return map[status] ?? map.cancelled;
}

/** Read-only hero matching add/edit details layout (logo, title, price, chips, optional trial line). */
export type SubscriptionDetailReadOnlyHeroProps = {
  serviceName: string;
  domain?: string;
  currency: CurrencyCode;
  price: number;
  billingCycle: BillingCycle;
  customCycleDays?: number;
  category: string;
  isTrial: boolean;
  trialLengthDays: number | null;
  status: SubscriptionStatus;
};

export function SubscriptionDetailReadOnlyHero(p: SubscriptionDetailReadOnlyHeroProps) {
  const priceLine = `${CURRENCY_SYMBOLS[p.currency]}${formatAmountDigits(p.price)} / ${heroCycleDisplay(
    p.billingCycle,
    p.customCycleDays,
  )}`;
  const statusPill = readOnlyHeroStatusPill(p.status);

  return (
    <View style={s.heroCard}>
      <View style={s.heroTextColumn}>
        <View style={s.heroStack}>
          <View style={s.heroLogoCircle}>
            {p.domain ? (
              <CompanyLogo
                domain={p.domain}
                size={HERO_SMALL_LOGO_SIZE}
                rounded={24}
                fallbackText={p.serviceName}
              />
            ) : (
              <Text style={s.heroFallbackText}>{(p.serviceName[0] ?? '?').toUpperCase()}</Text>
            )}
          </View>
          <View style={s.heroTitlePrice}>
            <Text style={s.heroNameInput} numberOfLines={3}>
              {p.serviceName}
            </Text>
            <Text style={s.heroPrice}>{priceLine}</Text>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.heroChipsScroll}
        contentContainerStyle={s.heroChipsScrollContent}
      >
        <View style={s.heroChipWrap}>
          <View style={[s.heroChipPill, { backgroundColor: statusPill.bg }]}>
            <Text style={[s.heroChipPillText, { color: '#FFFFFF' }]} numberOfLines={1}>
              {statusPill.label}
            </Text>
          </View>
        </View>
        <View style={s.heroChipWrap}>
          <View style={s.heroChipPill}>
            <Text style={s.heroChipPillText} numberOfLines={1}>
              {heroBillingLabel(p.billingCycle)}
            </Text>
          </View>
        </View>
        <View style={s.heroChipWrap}>
          <View style={s.heroChipPill}>
            <Text style={s.heroChipPillText} numberOfLines={1}>
              {p.category}
            </Text>
          </View>
        </View>
      </ScrollView>
      {p.isTrial && p.trialLengthDays != null ? (
        <View style={s.heroTextColumn}>
          <Text style={s.heroSub}>Trial · {p.trialLengthDays} days</Text>
        </View>
      ) : null}
    </View>
  );
}

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
        onPress={() => {
          void hapticSelection();
          onPress();
        }}
        style={({ pressed }) => [s.row, pressed && s.rowPressed]}
      >
        {inner}
      </Pressable>
    );
  }

  return <View style={s.row}>{inner}</View>;
}

const STATUS_DIM = colors.textMuted;

/** Shared status pill — detail hero + read-only summary rows. */
export function SubscriptionStatusBadge({ status }: { status: SubscriptionStatus | string }) {
  const configs: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: '#E8F9EE', color: '#1B8A3C', label: 'Active' },
    trial: { bg: '#EEE6FF', color: '#6B3FBC', label: 'Trial' },
    paused: { bg: '#FFF3E0', color: '#B05E00', label: 'Paused' },
    cancelled: { bg: 'rgba(11,8,3,0.07)', color: STATUS_DIM, label: 'Cancelled' },
  };
  const c = configs[status] ?? configs.cancelled;
  return (
    <View style={statusBadgeStyles.badgeWrap}>
      <View style={[statusBadgeStyles.badge, { backgroundColor: c.bg }]}>
        <Text style={[statusBadgeStyles.badgeText, { color: c.color }]}>{c.label}</Text>
      </View>
    </View>
  );
}

const statusBadgeStyles = {
  badgeWrap: { alignItems: 'flex-end' as const },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' as const },
};

function formatLocalYmd(iso: string | undefined) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return '—';
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatIsoDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function notifyLabelOnly(days: number) {
  if (days === 0) return 'Same day';
  if (days >= 7) return '1 week before';
  return `${days} day${days > 1 ? 's' : ''} before`;
}

export type SubscriptionDetailsReadOnlySectionsProps = {
  price: number;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  customCycleDays?: number;
  subscriptionStartDate: string;
  nextChargeDate: string;
  isTrial: boolean;
  trialLengthDays: number | null;
  list: string;
  paymentMethod?: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderTime: string;
  url?: string;
  description?: string;
  totalSpent: number;
  subscribedDays: number;
};

/** Read-only grouped sections matching `SubscriptionDetailsForm` layout (amount → schedule → …). */
export function SubscriptionDetailsReadOnlySections(p: SubscriptionDetailsReadOnlySectionsProps) {
  const pm = p.paymentMethod?.trim() ? p.paymentMethod : '—';

  return (
    <>
      <GroupedCard>
        <CellRow label="Amount" value={formatMoney(p.price, p.currency)} />
        <Sep />
        <CellRow label="Currency" value={p.currency} />
      </GroupedCard>

      <SectionHeader>Schedule</SectionHeader>
      <GroupedCard>
        <CellRow label="Payment date" value={formatIsoDate(p.nextChargeDate)} />
        <Sep />
        <CellRow label="Subscription start" value={formatLocalYmd(p.subscriptionStartDate)} />
        <Sep />
        <CellRow label="Free trial" value={p.isTrial ? 'On' : 'Off'} />
        {p.isTrial && p.trialLengthDays != null ? (
          <>
            <Sep />
            <CellRow label="Trial length" value={`${p.trialLengthDays} days`} />
          </>
        ) : null}
        {p.billingCycle === 'custom' ? (
          <>
            <Sep />
            <CellRow
              label="Custom interval (days)"
              value={String(p.customCycleDays ?? '—')}
            />
          </>
        ) : null}
      </GroupedCard>

      <SectionHeader>Organization</SectionHeader>
      <GroupedCard>
        <CellRow label="List" value={p.list} />
        <Sep />
        <CellRow label="Payment method" value={pm} />
      </GroupedCard>

      <SectionHeader>Reminders</SectionHeader>
      <GroupedCard>
        <CellRow
          label="Renewal reminders"
          sublabel={p.isTrial ? 'Get notified before trial ends' : 'Get notified before renewals'}
          value={p.reminderEnabled ? 'On' : 'Off'}
        />
        {p.reminderEnabled ? (
          <>
            <Sep />
            <CellRow label="Notify me" value={notifyLabelOnly(p.reminderDaysBefore)} />
            <Sep />
            <CellRow label="Time" value={p.reminderTime} />
          </>
        ) : null}
      </GroupedCard>

      {p.url?.trim() ? (
        <>
          <SectionHeader>Website</SectionHeader>
          <GroupedCard>
            <View style={s.row}>
              <Text style={s.secondaryText}>{p.url.trim()}</Text>
            </View>
          </GroupedCard>
        </>
      ) : null}

      {p.description?.trim() ? (
        <>
          <SectionHeader>Notes</SectionHeader>
          <GroupedCard>
            <Text style={s.nativeNotesInput}>{p.description.trim()}</Text>
          </GroupedCard>
        </>
      ) : null}

      <SectionHeader>Summary</SectionHeader>
      <GroupedCard>
        <CellRow
          label="Total spent"
          sublabel="Sum of projected charges to date"
          value={formatMoney(p.totalSpent, p.currency)}
        />
        <Sep />
        <CellRow
          label="Member for"
          value={`${p.subscribedDays} day${p.subscribedDays !== 1 ? 's' : ''}`}
        />
      </GroupedCard>
    </>
  );
}

export {
  GroupedCard as SubscriptionFormGroupedCard,
  SectionHeader as SubscriptionFormSectionHeader,
  Sep as SubscriptionFormSep,
  CellRow as SubscriptionFormCellRow,
};
