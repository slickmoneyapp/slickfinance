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
import { SFIcon } from '../components/SFIcon';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { hapticSelection } from '../ui/haptics';
import { sendTestNotification } from '../features/notifications/service';
import { colors, spacing } from '../ui/theme';
import { SectionLabel, SurfaceCard, AppButton } from '../ui/components';
import { TabScreenBackground } from '../components/TabScreenBackground';
import { useAuthStore } from '../features/auth/store';
import { usePremiumStore } from '../features/premium/store';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export function SettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permStatus, setPermStatus] = useState<PermissionStatus>('undetermined');
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [sendingTest, setSendingTest] = useState(false);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const currentProvider = useAuthStore((s) => s.currentProvider);
  const isPremium = usePremiumStore((s) => s.isPremium);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermStatus(status as PermissionStatus);
    });
  }, []);

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

  return (
    <TabScreenBackground variant="figma" edges={['left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic">

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
                <SFIcon name="suit.diamond" size={20} color="#CB30E0" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.premiumTitle}>Upgrade to Premium</Text>
                  <Text style={styles.premiumSub}>Unlock all features</Text>
                </View>
                <SFIcon name="chevron.right" size={18} color={colors.textMuted} />
              </Pressable>
            </SurfaceCard>
          </>
        )}

        {/* Notifications section */}
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
                onValueChange={handleMasterToggle}
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
        <SectionLabel>Debug</SectionLabel>
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

        {/* Account */}
        <SectionLabel>Account</SectionLabel>
        <SurfaceCard style={styles.card}>
          <SettingsRow
            label={user?.email ?? 'Signed In'}
            sublabel={
              currentProvider === 'apple'
                ? 'Apple Account'
                : currentProvider === 'google'
                  ? 'Google Account'
                  : 'Account'
            }
            right={null}
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

        {/* App info */}
        <SectionLabel>About</SectionLabel>
        <SurfaceCard style={styles.card}>
          <SettingsRow label="Version" sublabel="Slick Money" right={<Text style={styles.valueText}>1.0.0</Text>} />
        </SurfaceCard>

        <View style={{ height: 40 }} />
      </ScrollView>
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

const styles = StyleSheet.create({
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backText: { fontSize: 16, fontWeight: '600', color: colors.text },

  content: { paddingBottom: 40, paddingHorizontal: spacing.screenX },

  card: {
    paddingVertical: 4,
    paddingHorizontal: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowSublabel: { fontSize: 12, fontWeight: '500', color: colors.textMuted },
  valueText: { fontSize: 14, fontWeight: '600', color: colors.textMuted },

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
