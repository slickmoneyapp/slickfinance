import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  DynamicColorIOS,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { SFIcon } from '../components/SFIcon';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { PRIVACY_URL, TERMS_URL } from '../constants/legalUrls';
import { openUrlInApp } from '../lib/openInAppBrowser';
import { hapticSelection } from '../ui/haptics';
import { colors, figma, spacing } from '../ui/theme';
import { useAuthStore } from '../features/auth/store';
import { usePremiumStore } from '../features/premium/store';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

function parseTime(hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(h) ? h! : 9, Number.isFinite(m) ? m! : 0, 0, 0);
  return d;
}

const SUPPORT_EMAIL = 'info@slickmoney.app';
const APP_STORE_URL = 'https://apps.apple.com/app/slick-money/id6745404495';
const SHARE_URL = 'https://apps.apple.com/app/slick-money/id6745404495';

// ─── iOS dynamic colors (same as SubscriptionsScreen) ─────────────────────────

const iosDynamic = (light: string, dark: string, fallback: string = light) =>
  Platform.OS === 'ios' ? DynamicColorIOS({ light, dark }) : fallback;

const IOS_CARD_BG = iosDynamic('#FFFFFF', '#1C1C1E');
const IOS_PRIMARY = iosDynamic('#111111', '#FFFFFF', colors.text);
const IOS_SECONDARY = iosDynamic('rgba(60, 60, 67, 0.62)', 'rgba(235, 235, 245, 0.60)', colors.textMuted);
const IOS_SEPARATOR = iosDynamic('rgba(60, 60, 67, 0.24)', 'rgba(84, 84, 88, 0.65)', colors.borderSoft);
const IOS_ROW_HIGHLIGHT = iosDynamic('rgba(120, 120, 128, 0.12)', 'rgba(118, 118, 128, 0.24)');

const TIMING_ROW_HEIGHT = 78;

export function SettingsScreen() {
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permStatus, setPermStatus] = useState<PermissionStatus>('undetermined');
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const currentProvider = useAuthStore((s) => s.currentProvider);
  const isPremium = usePremiumStore((s) => s.isPremium);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermStatus(status as PermissionStatus);
    });
  }, []);

  const notificationsActive = masterEnabled && permStatus === 'granted';
  const rowAnim = useRef(new Animated.Value(notificationsActive ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(rowAnim, {
      toValue: notificationsActive ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [notificationsActive]);

  async function handleMasterToggle(value: boolean) {
    Haptics.selectionAsync();
    if (value) {
      const { status, canAskAgain } = await Notifications.getPermissionsAsync();
      if (status !== 'granted') {
        if (canAskAgain) {
          const { status: newStatus } = await Notifications.requestPermissionsAsync();
          setPermStatus(newStatus as PermissionStatus);
          setMasterEnabled(newStatus === 'granted');
          return;
        } else {
          Alert.alert(
            'Notifications Blocked',
            'Please enable notifications in Settings > Slick Money.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() },
            ],
          );
          return;
        }
      }
      setPermStatus('granted');
    }
    setMasterEnabled(value);
  }
  const initials = (() => {
    const fullName = user?.user_metadata?.full_name;
    if (fullName && typeof fullName === 'string') {
      const parts = fullName.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
      if (parts[0]?.length) return parts[0][0]!.toUpperCase();
    }
    return user?.email ? user.email[0]!.toUpperCase() : '?';
  })();
  const displayName = user?.user_metadata?.full_name ?? user?.email ?? 'User';
  const providerLabel =
    currentProvider === 'apple' ? 'Apple Account'
      : currentProvider === 'google' ? 'Google Account'
        : 'Account';

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={[s.content, { minHeight: Platform.OS === 'ios' ? windowHeight + 1 : windowHeight }]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
      alwaysBounceVertical
      bounces
    >
      {/* ── Profile + Premium Banner (negative overlap) ── */}
      <View style={s.profileGroup}>
        <View style={s.profileCard}>
          <Pressable
            onPress={() => { void hapticSelection(); }}
            style={({ pressed }) => [s.profileRow, pressed && s.profileRowPressed]}
          >
            <View style={s.avatarRing}>
              <LinearGradient
                colors={['#43D568', '#2FC154', '#1BAD40']}
                locations={[0.021, 0.3703, 1]}
                style={s.avatar}
              >
                <Text style={s.avatarText}>{initials}</Text>
              </LinearGradient>
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName} numberOfLines={1}>{displayName}</Text>
              <Text style={s.profileEmail} numberOfLines={1}>{user?.email ?? providerLabel}</Text>
            </View>
            <SFIcon name="chevron.right" size={16} color="#000" weight="semibold" />
          </Pressable>
        </View>

        {!isPremium && (
          <Pressable
            onPress={() => { void hapticSelection(); navigation.navigate('Paywall'); }}
            style={({ pressed }) => [s.premiumBanner, pressed && { opacity: 0.85 }]}
          >
            <Text style={s.premiumTitle}>Upgrade to Premium</Text>
            <View style={s.premiumBadge}>
              <Text style={s.premiumBadgeText}>Upgrade</Text>
            </View>
          </Pressable>
        )}
      </View>

      {/* ── App Preferences ── */}
      <SectionHeader>App Preferences</SectionHeader>
      <GroupedCard>
        <CellRow label="Default Currency" value="$ USD" chevron onPress={() => {}} />
        <Sep />
        <CellRow label="Categories" chevron onPress={() => {}} />
        <Sep />
        <CellRow label="Payment Methods" chevron onPress={() => {}} />
      </GroupedCard>

      {/* ── Notifications ── */}
      <SectionHeader>Notifications</SectionHeader>

      {permStatus === 'denied' && (
        <View style={s.banner}>
          <Text style={s.bannerText}>Notifications are blocked. Open Settings to allow them.</Text>
          <Pressable onPress={() => Linking.openSettings()} style={s.bannerLink}>
            <Text style={s.bannerLinkText}>Open Settings</Text>
          </Pressable>
        </View>
      )}

      <GroupedCard>
        <CellRow
          label="Renewal Reminders"
          sublabel="Get notified before renewals"
          right={
            <Switch
              value={notificationsActive}
              onValueChange={handleMasterToggle}
              trackColor={{ false: '#D9D9D9', true: '#30CE5A' }}
              thumbColor={Platform.OS === 'android' ? '#ffffff' : undefined}
            />
          }
        />
        <Animated.View
          style={{
            height: rowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, TIMING_ROW_HEIGHT],
            }),
            opacity: rowAnim,
            overflow: 'hidden',
          }}
        >
          <Sep />
          <CellRow
            label="Reminder Timing"
            sublabel="Choose reminder time"
            right={
              <DateTimePicker
                value={parseTime(reminderTime)}
                mode="time"
                display="compact"
                onChange={(_, selected) => {
                  if (selected) {
                    const hh = String(selected.getHours()).padStart(2, '0');
                    const mm = String(selected.getMinutes()).padStart(2, '0');
                    setReminderTime(`${hh}:${mm}`);
                  }
                }}
              />
            }
          />
        </Animated.View>
      </GroupedCard>

      {/* ── Feedback ── */}
      <SectionHeader>Feedback</SectionHeader>
      <GroupedCard>
        <CellRow label="Send Feedback" chevron onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Slick%20Money%20Feedback`)} />
        <Sep />
        <CellRow label="Roadmap" chevron onPress={() => {}} />
      </GroupedCard>

      {/* ── Support ── */}
      <SectionHeader>Support</SectionHeader>
      <GroupedCard>
        <CellRow label="Rate App" chevron onPress={() => void openUrlInApp(APP_STORE_URL)} />
        <Sep />
        <CellRow label="Share App" chevron onPress={() => Share.share({ url: SHARE_URL, message: 'Check out Slick Money — track your subscriptions!' })} />
        <Sep />
        <CellRow label="Contact Support" chevron onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} />
      </GroupedCard>

      {/* ── Legal ── */}
      <SectionHeader>Legal</SectionHeader>
      <GroupedCard>
        <CellRow label="Privacy Policy" chevron onPress={() => void openUrlInApp(PRIVACY_URL)} />
        <Sep />
        <CellRow label="Terms of Use" chevron onPress={() => void openUrlInApp(TERMS_URL)} />
      </GroupedCard>

      {/* ── Sign Out ── */}
      <GroupedCard style={{ marginTop: 24 }}>
        <Pressable
          onPress={() => {
            Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign Out', style: 'destructive', onPress: signOut },
            ]);
          }}
          style={({ pressed }) => [s.signOutRow, pressed && s.rowPressed]}
        >
          <Text style={s.signOutText}>Sign Out</Text>
        </Pressable>
      </GroupedCard>

      {/* ── Footer ── */}
      <Text style={s.footer}>Slick Money Version 1.0.0</Text>

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

// ─── Reusable list components (same pattern as SubscriptionsScreen) ───────────

function GroupedCard({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.groupedCard, style]}>{children}</View>;
}

function SectionHeader({ children }: { children: string }) {
  return <Text style={s.sectionHeader}>{children}</Text>;
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
        {chevron && <SFIcon name="chevron.right" size={13} color={colors.textSoft} weight="semibold" />}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 40,
    flexGrow: 1,
  },

  // Grouped card (same as subscription list card)
  groupedCard: {
    backgroundColor: IOS_CARD_BG,
    borderRadius: 24,
    overflow: 'hidden',
  },

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

  // Typography (iOS dynamic)
  primaryText: { fontSize: 16, fontWeight: '600', color: IOS_PRIMARY },
  secondaryText: { fontSize: 14, fontWeight: '500', color: IOS_SECONDARY },

  // Separator — HIG: starts at leading text edge, extends to trailing card edge
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: 20,
  },

  // Section header
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: IOS_SECONDARY,
    paddingHorizontal: 20,
    marginTop: 24,
    marginBottom: spacing.sectionTitleToCard,
  },

  // Profile + Premium Banner — negative overlap group (Figma gap: -21px)
  profileGroup: {
    marginTop:
      figma.subscriptions273.titleToSpendingGroupGap -
      figma.subscriptions273.spendingGroupPredecessorStack,
  },
  // Profile card (Figma node 514-958)
  profileCard: {
    padding: 20,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 24,
    elevation: 2,
    zIndex: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileRowPressed: {
    opacity: 0.7,
  },
  avatarRing: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(48, 206, 90, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#005406',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  profileInfo: { flex: 1, gap: 4 },
  profileName: { fontSize: 20, fontWeight: '600', color: IOS_PRIMARY },
  profileEmail: { fontSize: 15, fontWeight: '400', color: IOS_SECONDARY },
  // Premium banner (Figma node 514-972)
  premiumBanner: {
    marginTop: -21,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 33,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
    backgroundColor: '#F8E8FB',
  },
  premiumTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  premiumBadge: {
    backgroundColor: '#CB30E0',
    borderRadius: 50,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  premiumBadgeText: { fontSize: 14, fontWeight: '600', color: '#FFFFFF' },

  // Sign out
  signOutRow: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#C62828' },

  // Banner
  banner: {
    backgroundColor: 'rgba(203,48,224,0.09)',
    borderRadius: 14,
    padding: 14,
    gap: 8,
    marginBottom: 8,
  },
  bannerText: { fontSize: 13, fontWeight: '600', color: colors.text },
  bannerLink: { alignSelf: 'flex-start' },
  bannerLinkText: { fontSize: 13, fontWeight: '700', color: colors.accent },

  // Footer
  footer: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSoft,
    marginTop: 12,
    paddingHorizontal: 20,
  },
});
