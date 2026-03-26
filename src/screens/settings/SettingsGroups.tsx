import React, { useMemo } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../App';
import { useAuthStore } from '../../features/auth/store';
import { hapticSelection } from '../../ui/haptics';
import { AppScreen, IconCircleButton, ScreenHeader, SectionLabel, SurfaceCard } from '../../ui/components';
import { colors, spacing } from '../../ui/theme';

type LegalProps = NativeStackScreenProps<RootStackParamList, 'LegalSettings'>;
type AccountProps = NativeStackScreenProps<RootStackParamList, 'AccountSettings'>;
type CategoriesProps = NativeStackScreenProps<RootStackParamList, 'CategoriesManage'>;
type PaymentProps = NativeStackScreenProps<RootStackParamList, 'PaymentMethodsManage'>;

export function LegalSettingsScreen({ navigation }: LegalProps) {
  function openInApp(url: string) {
    void WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: colors.text,
    } as any);
  }

  return (
    <AppScreen edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Legal" left={<IconCircleButton icon="chevron-back" onPress={() => navigation.goBack()} />} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>Legal</SectionLabel>
        <SurfaceCard style={s.card}>
          <Row label="Privacy Policy" onPress={() => openInApp('https://www.slickmoney.app/privacy')} />
          <Divider />
          <Row label="Terms of Use" onPress={() => openInApp('https://www.slickmoney.app/terms')} />
        </SurfaceCard>
      </ScrollView>
    </AppScreen>
  );
}

export function AccountSettingsScreen({ navigation }: AccountProps) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const currentProvider = useAuthStore((s) => s.currentProvider);

  const accountLabel = useMemo(() => {
    if (user?.email) return user.email;
    return currentProvider === 'apple'
      ? 'Apple Account'
      : currentProvider === 'google'
        ? 'Google Account'
        : 'Account';
  }, [currentProvider, user?.email]);

  function openInApp(url: string) {
    void WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: colors.text,
    } as any);
  }

  return (
    <AppScreen edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Account" left={<IconCircleButton icon="chevron-back" onPress={() => navigation.goBack()} />} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingTop: 12, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>Subscription</SectionLabel>
        <SurfaceCard style={s.card}>
          <Row label="Restore Purchases" onPress={() => Alert.alert('Restore Purchases', 'Not implemented yet.')} />
          <Divider />
          <Row label="Manage Subscription" onPress={() => openInApp('https://apps.apple.com/account/subscriptions')} />
        </SurfaceCard>

        <SectionLabel>Account</SectionLabel>
        <SurfaceCard style={s.card}>
          <View style={s.row}>
            <Text style={s.rowLabel}>{accountLabel}</Text>
            <View />
          </View>
          <Divider />
          <RowDanger
            label="Log Out"
            icon="log-out-outline"
            onPress={() =>
              Alert.alert('Log out', 'Are you sure you want to log out?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Log out', style: 'destructive', onPress: signOut },
              ])
            }
          />
        </SurfaceCard>
      </ScrollView>
    </AppScreen>
  );
}

export function CategoriesManageScreen({ navigation }: CategoriesProps) {
  return (
    <AppScreen edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Categories" left={<IconCircleButton icon="chevron-back" onPress={() => navigation.goBack()} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingTop: 12, paddingBottom: 40 }}>
        <SurfaceCard style={s.card}>
          <Text style={s.body}>Category management will live here.</Text>
        </SurfaceCard>
      </ScrollView>
    </AppScreen>
  );
}

export function PaymentMethodsManageScreen({ navigation }: PaymentProps) {
  return (
    <AppScreen edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader title="Payment Methods" left={<IconCircleButton icon="chevron-back" onPress={() => navigation.goBack()} />} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingTop: 12, paddingBottom: 40 }}>
        <SurfaceCard style={s.card}>
          <Text style={s.body}>Payment method management will live here.</Text>
        </SurfaceCard>
      </ScrollView>
    </AppScreen>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <Text style={s.rowLabel}>{label}</Text>
      <View style={s.rowRight}>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </View>
    </Pressable>
  );
}

function RowDanger({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        void hapticSelection();
        onPress();
      }}
      style={({ pressed }) => [s.row, pressed && s.pressed]}
    >
      <Text style={[s.rowLabel, { color: '#C62828' }]}>{label}</Text>
      <View style={s.rowRight}>
        <Ionicons name={icon} size={18} color="#C62828" />
      </View>
    </Pressable>
  );
}

function Divider() {
  return <View style={s.divider} />;
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' },
  body: { padding: 16, fontSize: 15, fontWeight: '500', color: colors.textMuted, lineHeight: 21 },
  row: {
    minHeight: 48,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressed: { opacity: 0.7 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle },
});

