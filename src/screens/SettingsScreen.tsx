import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { hapticSelection } from '../ui/haptics';
import { sendTestNotification } from '../features/notifications/service';
import { colors, spacing } from '../ui/theme';
import { PageHeader, SectionLabel, SurfaceCard, AppButton } from '../ui/components';
import { TabScreenBackground } from '../components/TabScreenBackground';
import { USE_FIGMA_SINGLE_PAGE_NAV } from '../config/featureFlags';
import { useAuthStore } from '../features/auth/store';
import { usePremiumStore } from '../features/premium/store';
import * as WebBrowser from 'expo-web-browser';
import { useSettingsStore } from '../features/settings/store';
import { TimePickerModal } from '../components/TimePickerModal';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permStatus, setPermStatus] = useState<PermissionStatus>('undetermined');
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const currentProvider = useAuthStore((s) => s.currentProvider);
  const isPremium = usePremiumStore((s) => s.isPremium);

  const preferredCurrency = useSettingsStore((s) => s.preferredCurrency);
  const defaultReminderTime = useSettingsStore((s) => s.defaultReminderTime);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setDefaultReminderTime = useSettingsStore((s) => s.setDefaultReminderTime);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermStatus(status as PermissionStatus);
    });
  }, []);

  async function handleTestNotification() {
    if (sendingTest) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Notifications Off', 'Enable notifications above first.');
      return;
    }
    setSendingTest(true);
    await sendTestNotification();
    setSendingTest(false);
    Alert.alert('Sent!', 'Check your notification in ~2 seconds.');
  }

  const notificationsActive = masterEnabled && permStatus === 'granted';

  function openInApp(url: string) {
    void WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: colors.text,
    } as any);
  }

  async function handleNotificationsToggle(value: boolean) {
    void Haptics.selectionAsync();
    if (!value) {
      void setNotificationsEnabled(false);
      setMasterEnabled(false);
      return;
    }

    const { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status === 'granted') {
      setPermStatus('granted');
      void setNotificationsEnabled(true);
      setMasterEnabled(true);
      return;
    }

    if (canAskAgain) {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      setPermStatus(newStatus as PermissionStatus);
      const enabled = newStatus === 'granted';
      void setNotificationsEnabled(enabled);
      setMasterEnabled(enabled);
      return;
    }

    void setNotificationsEnabled(false);
    setMasterEnabled(false);
    Alert.alert(
      'Notifications Blocked',
      'Please enable notifications in Settings > Slick Money.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
  }

  return (
    <TabScreenBackground variant="figma" edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {USE_FIGMA_SINGLE_PAGE_NAV ? (
          <Pressable
            onPress={() => {
              void hapticSelection();
              navigation.goBack();
            }}
            style={({ pressed }) => [styles.backRow, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
            <Text style={styles.backText}>Subscriptions</Text>
          </Pressable>
        ) : null}
        <PageHeader title="Settings" titleVariant="figma" />

        {/* Premium */}
        {!isPremium && (
          <>
            <SectionLabel>Premium</SectionLabel>
            <SurfaceCard style={styles.card}>
              <Pressable
                onPress={() => {
                  void hapticSelection();
                  navigation.navigate('Paywall');
                }}
                style={({ pressed }) => [styles.premiumBtn, pressed && styles.pressed]}
              >
                <Ionicons name="diamond-outline" size={20} color="#CB30E0" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                  <Text style={styles.premiumSub}>Unlock all features</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </Pressable>
            </SurfaceCard>
          </>
        )}

        {/* Notifications section */}
        <SectionLabel>App</SectionLabel>

        <SurfaceCard style={styles.card}>
          <SettingsNavRow
            label="Preferred Currency"
            value={preferredCurrency}
            onPress={() => navigation.navigate('CurrencySelect')}
          />
          <Divider />
          <SettingsInlineRow
            label="Default Reminder Time"
            value={defaultReminderTime}
            onPress={() => setShowTimePicker(true)}
          />
          <Divider />
          <SettingsNavRow label="Categories" onPress={() => navigation.navigate('CategoriesManage')} />
          <Divider />
          <SettingsNavRow label="Payment Methods" onPress={() => navigation.navigate('PaymentMethodsManage')} />
          <Divider />
          <SettingsToggleRow
            label="Notifications"
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
          />
        </SurfaceCard>

        <SectionLabel>Notifications</SectionLabel>

        {permStatus === 'denied' ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Notifications are blocked. Open Settings to allow them.
            </Text>
            <View style={styles.bannerBtn}>
              <AppButton label="Open Settings" onPress={() => Linking.openSettings()} />
            </View>
          </View>
        ) : null}

        <SurfaceCard style={styles.card}>
          <SettingsRow
            label="Renewal Reminders"
            sublabel="Get notified before a subscription renews"
            right={
              <Switch
                value={notificationsActive}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: '#D9D9D9', true: '#30CE5A' }}
                thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
              />
            }
          />

          <Divider />

          <SettingsRow
            label="Reminder timing"
            sublabel="Reminder day and time are set inside each recurring subscription."
            right={null}
          />
        </SurfaceCard>

        {/* Test notification */}
        <SectionLabel>Test</SectionLabel>
        <SurfaceCard style={styles.card}>
          <Pressable
            onPress={handleTestNotification}
            style={({ pressed }) => [styles.testBtn, pressed && styles.pressed]}
          >
            <Text style={styles.testBtnText}>
              {sendingTest ? 'Sending…' : 'Send Test Notification'}
            </Text>
          </Pressable>
        </SurfaceCard>

        <SectionLabel>Feedback</SectionLabel>
        <SurfaceCard style={styles.card}>
          <SettingsNavRow label="Send Feedback" onPress={() => openInApp('https://slickmoney.featurebase.app/')} />
          <Divider />
          <SettingsNavRow label="Roadmap" onPress={() => openInApp('https://slickmoney.featurebase.app/roadmap')} />
        </SurfaceCard>

        <SectionLabel>Support</SectionLabel>
        <SurfaceCard style={styles.card}>
          <SettingsNavRow label="Rate App" onPress={() => Alert.alert('Rate App', 'Not wired yet.')} />
          <Divider />
          <SettingsNavRow label="Share App" onPress={() => Alert.alert('Share', 'Not wired yet.')} />
          <Divider />
          <SettingsNavRow label="Contact Support" onPress={() => openInApp('https://www.slickmoney.app/contact')} />
          <Divider />
          <SettingsNavRow label="FAQ" onPress={() => openInApp('https://www.slickmoney.app/#faq')} />
        </SurfaceCard>

        <SectionLabel>Legal</SectionLabel>
        <SurfaceCard style={styles.card}>
          <SettingsNavRow label="Legal" onPress={() => navigation.navigate('LegalSettings')} />
        </SurfaceCard>

        <SectionLabel>Account</SectionLabel>
        <SurfaceCard style={styles.card}>
          <SettingsNavRow
            label={user?.email ?? 'Account'}
            value={
              currentProvider === 'apple'
                ? 'Apple Account'
                : currentProvider === 'google'
                  ? 'Google Account'
                  : undefined
            }
            onPress={() => navigation.navigate('AccountSettings')}
          />
          <Divider />
          <Pressable
            onPress={() => {
              Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: signOut },
              ]);
            }}
            style={({ pressed }) => [styles.testBtn, pressed && styles.pressed]}
          >
            <Text style={[styles.testBtnText, { color: '#C62828' }]}>Sign Out</Text>
          </Pressable>
        </SurfaceCard>

        <SectionLabel>About</SectionLabel>
        <SurfaceCard style={styles.card}>
          <SettingsRow label="Version" sublabel="Slick Money" right={<Text style={styles.valueText}>1.0.0</Text>} />
        </SurfaceCard>

        <View style={{ height: 40 }} />
      </ScrollView>

      <TimePickerModal
        visible={showTimePicker}
        value={defaultReminderTime}
        onClose={() => setShowTimePicker(false)}
        onSelect={(v) => void setDefaultReminderTime(v)}
        title="Default reminder time"
      />
    </TabScreenBackground>
  );
}

function SettingsRow({
  label,
  sublabel,
  right,
}: {
  label: string;
  sublabel?: string;
  right: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel ? <Text style={styles.rowSublabel}>{sublabel}</Text> : null}
      </View>
      {right}
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

function SettingsNavRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        {value ? <Text style={styles.valueText} numberOfLines={1}>{value}</Text> : null}
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function SettingsInlineRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Text style={styles.rowLabel}>{label}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.valueText}>{value}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function SettingsToggleRow({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={(v) => {
          void hapticSelection();
          onValueChange(v);
        }}
        trackColor={{ false: '#D9D9D9', true: '#30CE5A' }}
        thumbColor={undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 16, fontWeight: '600', color: colors.text },

  content: { paddingBottom: spacing.screenX, paddingHorizontal: spacing.screenX },

  card: {
    paddingVertical: 4,
    paddingHorizontal: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 52,
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowSublabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  valueText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '60%' },

  divider: { height: 1, backgroundColor: colors.borderSubtle, marginHorizontal: -16 },

  pressed: { opacity: 0.75 },

  testBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  testBtnText: { fontSize: 15, fontWeight: '700', color: colors.accent },

  banner: {
    backgroundColor: 'rgba(203,48,224,0.09)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  bannerText: { fontSize: 13, fontWeight: '600', color: colors.text },
  bannerBtn: { alignSelf: 'flex-start' },

  premiumBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  premiumTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  premiumSub: { fontSize: 12, fontWeight: '500', color: colors.textMuted, marginTop: 2 },
});
