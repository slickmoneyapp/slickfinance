import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSubscriptionsStore } from '../features/subscriptions/store';
import { parseLocalDate, toLocalDateString } from '../features/subscriptions/buildBillingHistoryFromSubscription';
import type { NativeStackHeaderItem, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { colors } from '../ui/theme';
import { hapticImpactMedium, hapticSelection } from '../ui/haptics';
import { requestNotificationPermissions } from '../features/notifications/service';
import type { BillingCycle, CurrencyCode, Subscription } from '../features/subscriptions/types';
import {
  SubscriptionDetailsForm,
  SubscriptionDetailsReadOnlySections,
  SubscriptionDetailReadOnlyHero,
  TRIAL_LENGTH_OPTIONS,
  type TrialLengthDays,
} from '../features/subscriptions/SubscriptionDetailsForm';
import { subscriptionFormStyles } from '../features/subscriptions/subscriptionDetailsFormStyles';

type Props = NativeStackScreenProps<RootStackParamList, 'SubscriptionDetail'>;

const INK = colors.text;
const DIM = colors.textMuted;
const SAVE_HEADER_PURPLE = '#CB30E0';

function iosMajorVersion(): number {
  if (Platform.OS !== 'ios') return 0;
  const v = Platform.Version;
  const s = typeof v === 'number' ? String(v) : v;
  return parseInt(s.split('.')[0] ?? '0', 10) || 0;
}

/** `UIBarButtonItem.Style.prominent` — iOS 26+ (see Add Subscription details header). */
const IOS_USE_PROMINENT_SAVE_BUTTON = iosMajorVersion() >= 26;

const EDIT_BILLING_CYCLES: Subscription['billingCycle'][] = [
  'weekly',
  'monthly',
  'quarterly',
  'yearly',
  'custom',
];

function subscriptionToDraft(sub: Subscription): DraftState {
  const priceStr =
    sub.price % 1 === 0 ? String(sub.price) : sub.price.toFixed(2);
  let trialLen: TrialLengthDays = 7;
  const saved = sub.trialLengthDays;
  if (saved != null && (TRIAL_LENGTH_OPTIONS as readonly number[]).includes(saved)) {
    trialLen = saved as TrialLengthDays;
  }
  const startIso = sub.subscriptionStartDate;
  let startDate: Date;
  if (startIso) {
    const [y, m, d] = startIso.split('-').map(Number);
    startDate = new Date(y, m - 1, d, 12, 0, 0, 0);
  } else {
    startDate = new Date(sub.createdAt);
  }
  const subscriptionStartTouched =
    Boolean(sub.subscriptionStartDate && sub.subscriptionStartDate !== toLocalDateString(new Date(sub.nextChargeDate)));

  return {
    serviceName: sub.serviceName,
    price: priceStr,
    currency: sub.currency,
    billingCycle: sub.billingCycle,
    customCycleDays: sub.customCycleDays ?? 30,
    nextCharge: new Date(sub.nextChargeDate),
    subscriptionStartDate: startDate,
    isTrial: sub.isTrial,
    trialLengthDays: trialLen,
    list: sub.list,
    category: sub.category,
    paymentMethod: sub.paymentMethod?.trim() ?? '',
    reminderEnabled: sub.reminderEnabled,
    reminderDaysBefore: sub.reminderDaysBefore,
    reminderTime: sub.reminderTime,
    notes: sub.description ?? '',
    url: sub.url ?? '',
    subscriptionStartTouchedRefValue: subscriptionStartTouched,
  };
}

type DraftState = {
  serviceName: string;
  price: string;
  currency: CurrencyCode;
  billingCycle: BillingCycle;
  customCycleDays: number;
  nextCharge: Date;
  subscriptionStartDate: Date;
  isTrial: boolean;
  trialLengthDays: TrialLengthDays;
  list: string;
  category: string;
  paymentMethod: string;
  reminderEnabled: boolean;
  reminderDaysBefore: number;
  reminderTime: string;
  notes: string;
  url: string;
  /** Snapshot for ref init when entering edit — ref object updated in screen. */
  subscriptionStartTouchedRefValue: boolean;
};

export function SubscriptionDetailScreen({ navigation, route }: Props) {
  const { subscriptionId } = route.params;
  const sub = useSubscriptionsStore((s) => s.items.find((i) => i.id === subscriptionId));
  const update = useSubscriptionsStore((s) => s.update);
  const remove = useSubscriptionsStore((s) => s.remove);

  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saving, setSaving] = useState(false);
  /** Only populated while `mode === 'edit'` — view mode reads live `sub` from the store. */
  const [editDraft, setEditDraft] = useState<DraftState | null>(null);

  const nameRef = useRef<TextInput>(null);
  const priceRef = useRef<TextInput>(null);
  const subscriptionStartTouchedRef = useRef(false);

  const enterEdit = useCallback(() => {
    if (!sub) return;
    void hapticSelection();
    const d = subscriptionToDraft(sub);
    subscriptionStartTouchedRef.current = d.subscriptionStartTouchedRefValue;
    setEditDraft(d);
    setMode('edit');
  }, [sub]);

  const cancelEdit = useCallback(() => {
    if (!sub) return;
    void hapticSelection();
    setEditDraft(null);
    setMode('view');
  }, [sub]);

  const saveEdit = useCallback(async () => {
    if (!sub || !editDraft || saving) return;
    const numPrice = Number(editDraft.price.replace(',', '.'));
    if (!editDraft.serviceName.trim() || !Number.isFinite(numPrice) || numPrice <= 0) {
      Alert.alert('Missing info', 'Enter a service name and a valid price.');
      return;
    }

    setSaving(true);
    void hapticImpactMedium();

    let effectiveNextCharge = editDraft.nextCharge;
    if (editDraft.isTrial) {
      const trialEnd = new Date(editDraft.subscriptionStartDate.getTime());
      trialEnd.setDate(trialEnd.getDate() + editDraft.trialLengthDays);
      effectiveNextCharge = trialEnd;
    }

    try {
      await update(sub.id, {
        serviceName: editDraft.serviceName.trim(),
        category: (editDraft.category as Subscription['category']) ?? 'Other',
        price: numPrice,
        currency: editDraft.currency,
        billingCycle: editDraft.billingCycle,
        customCycleDays: editDraft.billingCycle === 'custom' ? Math.max(1, editDraft.customCycleDays) : undefined,
        subscriptionStartDate: toLocalDateString(editDraft.subscriptionStartDate),
        nextChargeDate: effectiveNextCharge.toISOString(),
        isTrial: editDraft.isTrial,
        trialLengthDays: editDraft.isTrial ? editDraft.trialLengthDays : null,
        status: editDraft.isTrial
          ? 'trial'
          : sub.status === 'cancelled'
            ? 'cancelled'
            : 'active',
        list: editDraft.list,
        paymentMethod: editDraft.paymentMethod.trim() || undefined,
        reminderEnabled: editDraft.reminderEnabled,
        reminderDaysBefore: editDraft.reminderDaysBefore,
        reminderTime: editDraft.reminderTime,
        url: editDraft.url.trim() || undefined,
        description: editDraft.notes.trim() || undefined,
      });
      setEditDraft(null);
      setMode('view');
    } finally {
      setSaving(false);
    }
  }, [sub, editDraft, saving, update]);

  useLayoutEffect(() => {
    if (!sub) {
      navigation.setOptions({
        title: 'Subscription',
        headerRight: undefined,
        headerLeft: undefined,
        unstable_headerRightItems: undefined,
        unstable_headerLeftItems: undefined,
      });
      return;
    }

    if (mode === 'view') {
      if (Platform.OS === 'ios') {
        navigation.setOptions({
          title: sub.serviceName,
          headerBackVisible: true,
          headerLeft: undefined,
          headerRight: undefined,
          unstable_headerLeftItems: undefined,
          unstable_headerRightItems: (): NativeStackHeaderItem[] => [
            {
              type: 'button',
              label: 'Edit',
              tintColor: INK,
              onPress: enterEdit,
              accessibilityLabel: 'Edit subscription',
            },
          ],
        });
      } else {
        navigation.setOptions({
          title: sub.serviceName,
          headerBackVisible: true,
          headerLeft: undefined,
          unstable_headerLeftItems: undefined,
          unstable_headerRightItems: undefined,
          headerRight: () => (
            <Pressable
              onPress={enterEdit}
              style={headerStyles.barButtonPad}
              accessibilityRole="button"
              accessibilityLabel="Edit subscription"
            >
              <Text style={headerStyles.action}>Edit</Text>
            </Pressable>
          ),
        });
      }
    } else if (Platform.OS === 'ios') {
      navigation.setOptions({
        title: sub.serviceName,
        headerBackVisible: false,
        headerLeft: undefined,
        headerRight: undefined,
        unstable_headerLeftItems: (): NativeStackHeaderItem[] => [
          {
            type: 'button',
            label: 'Cancel',
            tintColor: INK,
            onPress: cancelEdit,
            accessibilityLabel: 'Cancel editing',
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
            disabled: saving,
            onPress: () => {
              void saveEdit();
            },
            accessibilityLabel: 'Save changes',
          },
        ],
      });
    } else {
      navigation.setOptions({
        title: sub.serviceName,
        headerBackVisible: false,
        unstable_headerLeftItems: undefined,
        unstable_headerRightItems: undefined,
        headerLeft: () => (
          <Pressable
            onPress={cancelEdit}
            style={headerStyles.barButtonPad}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
          >
            <Text style={headerStyles.cancel}>Cancel</Text>
          </Pressable>
        ),
        headerRight: () => (
          <Pressable
            onPress={() => {
              void saveEdit();
            }}
            disabled={saving}
            style={[headerStyles.androidSaveButton, saving && headerStyles.saveDisabled]}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
          >
            <Text style={headerStyles.androidSaveLabel}>Save</Text>
          </Pressable>
        ),
      });
    }
  }, [navigation, sub, mode, saving, enterEdit, cancelEdit, saveEdit]);

  const handleReminderToggle = useCallback(async (value: boolean) => {
    if (!value) {
      setEditDraft((d) => (d ? { ...d, reminderEnabled: false } : d));
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
      setEditDraft((d) => (d ? { ...d, reminderEnabled: false } : d));
      return;
    }
    setEditDraft((d) => (d ? { ...d, reminderEnabled: true } : d));
  }, []);

  const setDraftField = useCallback(<K extends keyof DraftState>(key: K, value: DraftState[K]) => {
    setEditDraft((d) => (d ? { ...d, [key]: value } : d));
  }, []);

  useEffect(() => {
    if (!editDraft || mode !== 'edit') return;
    if (!subscriptionStartTouchedRef.current) {
      setEditDraft((d) =>
        d ? { ...d, subscriptionStartDate: new Date(d.nextCharge.getTime()) } : d,
      );
    }
  }, [editDraft?.nextCharge, mode]);

  /** Sum of projected charges from subscription start through today (see billing history). */
  const totalSpent = useMemo(() => {
    if (!sub) return 0;
    return sub.billingHistory
      .filter((e) => e.label === 'Charged' || e.label === 'Subscribed')
      .reduce((sum, e) => sum + e.amount, 0);
  }, [sub]);

  /** Days since subscription start (local date); falls back to account created if start is invalid. */
  const subscribedDays = useMemo(() => {
    if (!sub) return 0;
    const start = sub.subscriptionStartDate
      ? parseLocalDate(sub.subscriptionStartDate)
      : new Date(sub.createdAt);
    if (Number.isNaN(start.getTime())) {
      return Math.max(0, Math.floor((Date.now() - new Date(sub.createdAt).getTime()) / 86400000));
    }
    return Math.max(0, Math.floor((Date.now() - start.getTime()) / 86400000));
  }, [sub]);

  if (!sub) {
    return (
      <View style={fallbackStyles.screenRoot}>
        <View style={fallbackStyles.wrap}>
          <Text style={fallbackStyles.text}>Subscription not found.</Text>
          <Pressable onPress={() => navigation.goBack()} style={fallbackStyles.back}>
            <Text style={fallbackStyles.backLabel}>Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const subscription = sub;

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      'Delete Subscription?',
      `"${subscription.serviceName}" will be permanently removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await remove(subscription.id);
            navigation.goBack();
          },
        },
      ],
    );
  }

  if (mode === 'edit' && !editDraft) {
    return (
      <View style={fallbackStyles.screenRoot}>
        <View style={fallbackStyles.wrap}>
          <Text style={fallbackStyles.text}>Loading…</Text>
        </View>
      </View>
    );
  }

  // Root must be ScrollView only: iOS formSheet (RNSScreenContentWrapper) finds the scroll view as a direct subview; same as AddSubscription DetailsBody.
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={subscriptionFormStyles.detailsScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentInsetAdjustmentBehavior="scrollableAxes"
    >
          {mode === 'view' ? (
            <>
              <SubscriptionDetailReadOnlyHero
                serviceName={subscription.serviceName}
                domain={subscription.domain}
                currency={subscription.currency}
                price={subscription.price}
                billingCycle={subscription.billingCycle}
                customCycleDays={subscription.customCycleDays}
                category={subscription.category}
                isTrial={subscription.isTrial}
                trialLengthDays={subscription.trialLengthDays}
                status={subscription.status}
              />
              <SubscriptionDetailsReadOnlySections
                price={subscription.price}
                currency={subscription.currency}
                billingCycle={subscription.billingCycle}
                customCycleDays={subscription.customCycleDays}
                subscriptionStartDate={subscription.subscriptionStartDate}
                nextChargeDate={subscription.nextChargeDate}
                isTrial={subscription.isTrial}
                trialLengthDays={subscription.trialLengthDays}
                list={subscription.list}
                paymentMethod={subscription.paymentMethod}
                reminderEnabled={subscription.reminderEnabled}
                reminderDaysBefore={subscription.reminderDaysBefore}
                reminderTime={subscription.reminderTime}
                url={subscription.url}
                description={subscription.description}
                totalSpent={totalSpent}
                subscribedDays={subscribedDays}
              />
            </>
          ) : editDraft ? (
            <SubscriptionDetailsForm
              nameRef={nameRef}
              priceRef={priceRef}
              serviceName={editDraft.serviceName}
              onServiceNameChange={(v) => setDraftField('serviceName', v)}
              domain={subscription.domain}
              price={editDraft.price}
              onPriceChange={(v) => setDraftField('price', v)}
              currency={editDraft.currency}
              onCurrencyChange={(c) => setDraftField('currency', c)}
              billingCycle={editDraft.billingCycle}
              onBillingCycleChange={(c) => setDraftField('billingCycle', c)}
              billingCycleMenuIds={EDIT_BILLING_CYCLES}
              category={editDraft.category}
              onCategoryChange={(c) => setDraftField('category', c)}
              customCycleDays={editDraft.customCycleDays}
              onCustomCycleDaysChange={(n) => setDraftField('customCycleDays', n)}
              nextCharge={editDraft.nextCharge}
              onNextChargeChange={(d) => setDraftField('nextCharge', d)}
              subscriptionStartDate={editDraft.subscriptionStartDate}
              onSubscriptionStartDateChange={(d) => setDraftField('subscriptionStartDate', d)}
              subscriptionStartTouchedRef={subscriptionStartTouchedRef}
              isTrial={editDraft.isTrial}
              onIsTrialChange={(v) => setDraftField('isTrial', v)}
              trialLengthDays={editDraft.trialLengthDays}
              onTrialLengthDaysChange={(d) => setDraftField('trialLengthDays', d)}
              list={editDraft.list}
              onListChange={(v) => setDraftField('list', v)}
              paymentMethod={editDraft.paymentMethod}
              onPaymentMethodChange={(v) => setDraftField('paymentMethod', v)}
              reminderEnabled={editDraft.reminderEnabled}
              onReminderToggle={handleReminderToggle}
              reminderDays={editDraft.reminderDaysBefore}
              onReminderDaysChange={(n) => setDraftField('reminderDaysBefore', n)}
              reminderTime={editDraft.reminderTime}
              onReminderTimeChange={(t) => setDraftField('reminderTime', t)}
              notes={editDraft.notes}
              onNotesChange={(v) => setDraftField('notes', v)}
              url={editDraft.url}
              onUrlChange={(v) => setDraftField('url', v)}
            />
          ) : null}

          {mode === 'view' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Delete subscription"
              onPress={handleDelete}
              android_ripple={{ color: 'rgba(229, 57, 53, 0.16)' }}
              style={({ pressed }) => [
                subscriptionFormStyles.deleteSubscriptionButton,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={subscriptionFormStyles.deleteSubscriptionButtonText}>Delete subscription</Text>
            </Pressable>
          ) : null}
    </ScrollView>
  );
}

const headerStyles = StyleSheet.create({
  /** Matches native bar button insets when not using `unstable_header*Items`. */
  barButtonPad: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  action: { fontSize: 17, fontWeight: '600', color: INK },
  cancel: { fontSize: 17, fontWeight: '400', color: INK },
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
  saveDisabled: { opacity: 0.45 },
});

const fallbackStyles = StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.bg },
  wrap: { flex: 1, padding: 20, justifyContent: 'center' },
  text: { color: INK },
  back: { marginTop: 16, paddingVertical: 12 },
  backLabel: { color: DIM, fontWeight: '600' },
});

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
});
