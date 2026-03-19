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
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { sendTestNotification } from '../features/notifications/service';

type PermissionStatus = 'granted' | 'denied' | 'undetermined';

export function SettingsScreen() {
  const [permStatus, setPermStatus] = useState<PermissionStatus>('undetermined');
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [daysBefore, setDaysBefore] = useState<1 | 2 | 3>(1);
  const [sendingTest, setSendingTest] = useState(false);

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
            'Please enable notifications in Settings > Budget Planner.',
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
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Settings</Text>

        {/* Notifications section */}
        <SectionHeader title="Notifications" />

        {permStatus === 'denied' ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              Notifications are blocked. Open Settings to allow them.
            </Text>
            <Pressable onPress={() => Linking.openSettings()} style={styles.bannerBtn}>
              <Text style={styles.bannerBtnText}>Open Settings</Text>
            </Pressable>
          </View>
        ) : null}

        <SettingsCard>
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
            label="Remind me"
            sublabel={`${daysBefore} day${daysBefore > 1 ? 's' : ''} before renewal`}
            right={null}
          />
          <View style={styles.pillRow}>
            {([1, 2, 3] as const).map((d) => (
              <Pressable
                key={d}
                onPress={() => {
                  Haptics.selectionAsync();
                  setDaysBefore(d);
                }}
                style={({ pressed }) => [
                  styles.pill,
                  daysBefore === d && styles.pillActive,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.pillText, daysBefore === d && styles.pillTextActive]}>
                  {d} day{d > 1 ? 's' : ''}
                </Text>
              </Pressable>
            ))}
          </View>
        </SettingsCard>

        {/* Test notification */}
        <SectionHeader title="Debug" />
        <SettingsCard>
          <Pressable
            onPress={handleTestNotification}
            style={({ pressed }) => [styles.testBtn, pressed && styles.pressed]}
          >
            <Text style={styles.testBtnText}>
              {sendingTest ? 'Sending…' : 'Send Test Notification'}
            </Text>
          </Pressable>
        </SettingsCard>

        {/* App info */}
        <SectionHeader title="About" />
        <SettingsCard>
          <SettingsRow label="Version" sublabel="Budget Planner" right={<Text style={styles.valueText}>1.0.0</Text>} />
        </SettingsCard>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function SettingsCard({ children }: { children: React.ReactNode }) {
  return <View style={styles.card}>{children}</View>;
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
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  content: { padding: 16, paddingTop: 14 },

  pageTitle: { fontSize: 28, fontWeight: '900', color: '#0B0803', marginBottom: 6 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(11,8,3,0.52)',
    marginTop: 22,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 4,
    paddingHorizontal: 16,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowLabel: { fontSize: 15, fontWeight: '700', color: '#0B0803' },
  rowSublabel: { fontSize: 12, fontWeight: '500', color: 'rgba(11,8,3,0.55)' },
  valueText: { fontSize: 14, fontWeight: '600', color: 'rgba(11,8,3,0.55)' },

  divider: { height: 1, backgroundColor: 'rgba(11,8,3,0.06)', marginHorizontal: -16 },

  pillRow: { flexDirection: 'row', gap: 8, paddingBottom: 14 },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(11,8,3,0.06)',
  },
  pillActive: { backgroundColor: '#0B0803' },
  pillText: { fontSize: 13, fontWeight: '700', color: 'rgba(11,8,3,0.75)' },
  pillTextActive: { color: '#FFFFFF' },
  pressed: { opacity: 0.75 },

  testBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  testBtnText: { fontSize: 15, fontWeight: '700', color: '#CB30E0' },

  banner: {
    backgroundColor: 'rgba(203,48,224,0.08)',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  bannerText: { fontSize: 13, fontWeight: '600', color: '#0B0803' },
  bannerBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#CB30E0',
  },
  bannerBtnText: { fontSize: 12, fontWeight: '800', color: '#FFFFFF' },
});
