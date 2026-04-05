import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import {
  Image as RNImage,
  Platform,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import {
  useFonts,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { HeaderButton } from '@react-navigation/elements';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { adapty } from 'react-native-adapty';

import { SubscriptionsSkeleton } from './src/components/Skeleton';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { SubscriptionsScreen } from './src/screens/SubscriptionsScreen';
import { InvestScreen } from './src/screens/InvestScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import {
  ENABLE_BUDGET_TAB,
  ENABLE_INVEST_TAB,
} from './src/config/featureFlags';
import { AddSubscriptionFlowNavigator } from './src/navigation/AddSubscriptionStack';
import { SubscriptionDetailScreen } from './src/screens/SubscriptionDetailScreen';
import { EditSubscriptionScreen } from './src/screens/EditSubscriptionScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';
import { useNotificationSync } from './src/hooks/useNotificationSync';
import { prefetchTabBackground } from './src/assets/tabBackground';
import { useAuthStore } from './src/features/auth/store';
import { useSubscriptionsStore } from './src/features/subscriptions/store';
import { usePremiumStore } from './src/features/premium/store';
import { navigateRoot } from './src/navigation/navigateRoot';
import { hapticImpact, hapticSelection } from './src/ui/haptics';
import { stackHeaderLargeTitleStyle } from './src/constants/fonts';
import { TAB_SCREEN_BACKGROUND } from './src/assets/tabBackground';
import { colors } from './src/ui/theme';

SplashScreen.preventAutoHideAsync();

// ─── iOS version detection ────────────────────────────────────────────────────

const iosMajor =
  Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) : 0;

// ─── Shared native stack header options ───────────────────────────────────────

const stackScreenOptions: NativeStackNavigationOptions = {
  autoHideHomeIndicator: false,
  headerLargeTitle: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerStyle: { backgroundColor: 'transparent' },
  headerLargeStyle: { backgroundColor: 'transparent' },
  headerTintColor: '#007AFF',
  headerLargeTitleStyle: stackHeaderLargeTitleStyle,
  headerTitleStyle: {
    fontWeight: '600',
    color: '#000',
  },
  contentStyle: { backgroundColor: 'transparent' },
  ...(iosMajor >= 26
    ? {
        scrollEdgeEffects: {
          top: 'automatic',
          bottom: 'automatic',
          left: 'automatic',
          right: 'automatic',
        },
      }
    : iosMajor > 0
      ? { headerBlurEffect: 'systemChromeMaterial' as const }
      : {}),
};

// ─── Native nav bar “Add” (iOS: real UIBarButtonItem + SF Symbol — system sizing) ─

function makePlusToolbarOptions(
  onPress: () => void,
): NativeStackNavigationOptions {
  if (Platform.OS === 'ios') {
    return {
      unstable_headerRightItems: (): NativeStackHeaderItem[] => [
        {
          type: 'button',
          label: '',
          icon: { type: 'sfSymbol', name: 'plus.circle.fill' },
          tintColor: '#000',
          accessibilityLabel: 'Add',
          onPress,
        },
      ],
    };
  }
  return {
    headerRight: () => (
      <HeaderButton accessibilityLabel="Add" onPress={onPress}>
        <Ionicons name="add-circle" size={28} color="#000" />
      </HeaderButton>
    ),
  };
}

// ─── Type definitions ─────────────────────────────────────────────────────────

export type RootTabsParamList = {
  Subscriptions: undefined;
  Budget: undefined;
  Invest: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  AddSubscription: undefined;
  SubscriptionDetail: { subscriptionId: string };
  EditSubscription: { subscriptionId: string };
  Paywall: undefined;
};

// ─── Navigators ───────────────────────────────────────────────────────────────

const Tabs = createNativeBottomTabNavigator<RootTabsParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

type SubsStackParamList = { SubscriptionsList: undefined };
const SubsStack = createNativeStackNavigator<SubsStackParamList>();

type BudgetStackParamList = { BudgetMain: undefined };
const BudgetStackNav = createNativeStackNavigator<BudgetStackParamList>();

type InvestStackParamList = { InvestMain: undefined };
const InvestStackNav = createNativeStackNavigator<InvestStackParamList>();

type ProfileStackParamList = { ProfileMain: undefined };
const ProfileStackNav = createNativeStackNavigator<ProfileStackParamList>();

// ─── Per-tab background wrapper ───────────────────────────────────────────────

function TabStackWrapper({ children }: { children: React.ReactNode }) {
  const { width: screenWidth } = useWindowDimensions();
  const resolved = RNImage.resolveAssetSource(TAB_SCREEN_BACKGROUND);
  const aspect =
    resolved?.width && resolved?.height ? resolved.height / resolved.width : 0.81;
  const bgHeight = Math.round(screenWidth * aspect);

  return (
    <View style={tabWrapStyles.root}>
      <View style={tabWrapStyles.bgLayer} pointerEvents="none">
        <Image
          source={TAB_SCREEN_BACKGROUND}
          style={{ width: screenWidth, height: bgHeight }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="tab-screen-bg"
        />
      </View>
      {children}
    </View>
  );
}

const tabWrapStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F5F5' },
  bgLayer: { position: 'absolute', top: 0, left: 0, right: 0 },
});

// ─── Per-tab stack screens ────────────────────────────────────────────────────

function SubscriptionsStackScreen() {
  return (
    <TabStackWrapper>
      <SubsStack.Navigator
        screenOptions={({ navigation }) => ({
          ...stackScreenOptions,
          ...makePlusToolbarOptions(() => {
            void hapticImpact();
            navigateRoot(navigation as any, 'AddSubscription');
          }),
        })}
      >
        <SubsStack.Screen
          name="SubscriptionsList"
          component={SubscriptionsScreen}
          options={{ title: 'Subscriptions' }}
        />
      </SubsStack.Navigator>
    </TabStackWrapper>
  );
}

function BudgetStackScreen() {
  return (
    <TabStackWrapper>
      <BudgetStackNav.Navigator
        screenOptions={({ navigation }) => ({
          ...stackScreenOptions,
          ...makePlusToolbarOptions(() => {
            void hapticImpact();
            navigateRoot(navigation as any, 'AddSubscription');
          }),
        })}
      >
        <BudgetStackNav.Screen
          name="BudgetMain"
          component={BudgetScreen}
          options={{ title: 'Budget' }}
        />
      </BudgetStackNav.Navigator>
    </TabStackWrapper>
  );
}

function InvestStackScreen() {
  return (
    <TabStackWrapper>
      <InvestStackNav.Navigator
        screenOptions={({ navigation }) => ({
          ...stackScreenOptions,
          ...makePlusToolbarOptions(() => {
            void hapticImpact();
            navigateRoot(navigation as any, 'AddSubscription');
          }),
        })}
      >
        <InvestStackNav.Screen
          name="InvestMain"
          component={InvestScreen}
          options={{ title: 'Invest' }}
        />
      </InvestStackNav.Navigator>
    </TabStackWrapper>
  );
}

function ProfileStackScreen() {
  return (
    <TabStackWrapper>
      <ProfileStackNav.Navigator
        screenOptions={({ navigation }) => ({
          ...stackScreenOptions,
          ...makePlusToolbarOptions(() => {
            void hapticImpact();
            navigateRoot(navigation as any, 'AddSubscription');
          }),
        })}
      >
        <ProfileStackNav.Screen
          name="ProfileMain"
          component={SettingsScreen}
          options={{ title: 'Profile' }}
        />
      </ProfileStackNav.Navigator>
    </TabStackWrapper>
  );
}

// ─── Tab navigator ────────────────────────────────────────────────────────────

function tabBarIconSfSymbol(sfSymbol: string) {
  return () => ({ sfSymbol: sfSymbol as any });
}

function RootTabs() {
  return (
    <Tabs.Navigator
      tabBarActiveTintColor="#CB30E0"
      tabBarInactiveTintColor="#8C8C8C"
      screenListeners={{
        tabPress: () => {
          void hapticSelection();
        },
      }}
    >
      <Tabs.Screen
        name="Subscriptions"
        component={SubscriptionsStackScreen}
        options={{
          tabBarIcon: tabBarIconSfSymbol('creditcard'),
        }}
      />
      {ENABLE_BUDGET_TAB ? (
        <Tabs.Screen
          name="Budget"
          component={BudgetStackScreen}
          options={{
            tabBarIcon: tabBarIconSfSymbol('chart.pie'),
          }}
        />
      ) : null}
      {ENABLE_INVEST_TAB ? (
        <Tabs.Screen
          name="Invest"
          component={InvestStackScreen}
          options={{
            tabBarIcon: tabBarIconSfSymbol('chart.line.uptrend.xyaxis'),
          }}
        />
      ) : null}
      <Tabs.Screen
        name="Settings"
        component={ProfileStackScreen}
        options={{
          title: 'Profile',
          tabBarIcon: tabBarIconSfSymbol('person.circle'),
        }}
      />
    </Tabs.Navigator>
  );
}

// ─── App inner (auth + business logic) ────────────────────────────────────────

function AppInner() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_800ExtraBold });
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const initializeSubs = useSubscriptionsStore((s) => s.initialize);
  const checkAccess = usePremiumStore((s) => s.checkAccess);
  const setIsPremium = usePremiumStore((s) => s.setIsPremium);
  useNotificationSync();

  useEffect(() => {
    if (fontsLoaded && initialized) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, initialized]);

  useEffect(() => {
    if (!session) return;
    const unsubscribe = initializeSubs();
    return unsubscribe;
  }, [session, initializeSubs]);

  useEffect(() => {
    if (!session) return;
    checkAccess();
    const listener = adapty.addEventListener('onLatestProfileLoad', (profile) => {
      const hasAccess = profile.accessLevels?.['premium']?.isActive === true;
      setIsPremium(hasAccess);
    });
    return () => {
      listener.remove();
    };
  }, [session, checkAccess, setIsPremium]);

  if (!fontsLoaded || !initialized) {
    return (
      <>
        <StatusBar style="dark" />
        <SubscriptionsSkeleton />
      </>
    );
  }

  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <LoginScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <Stack.Navigator initialRouteName="Tabs">
        <Stack.Screen
          name="Tabs"
          component={RootTabs}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddSubscription"
          component={AddSubscriptionFlowNavigator}
          options={{
            headerShown: true,
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            headerLargeTitle: true,
            headerTransparent: true,
            headerShadowVisible: false,
            headerLargeTitleShadowVisible: false,
            headerStyle: { backgroundColor: 'transparent' },
            headerLargeStyle: { backgroundColor: 'transparent' },
            headerLargeTitleStyle: stackHeaderLargeTitleStyle,
            headerTitleStyle: {
              fontWeight: '600',
              color: '#000',
            },
            ...(iosMajor >= 26
              ? {}
              : iosMajor > 0
                ? { headerBlurEffect: 'systemChromeMaterial' as const }
                : {}),
            title: 'Add Subscription',
          }}
        />
        <Stack.Screen
          name="SubscriptionDetail"
          component={SubscriptionDetailScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            headerShadowVisible: false,
            /**
             * Prevent the form sheet from hijacking vertical list scroll gestures near edges.
             * Keep this only on SubscriptionDetail to preserve AddSubscription behavior.
             */
            ...(Platform.OS === 'ios' ? { sheetExpandsWhenScrolledToEdge: false } : {}),
            /**
             * iOS formSheet + transparent header: without flex + bg the native content view can
             * collapse to a blank white sheet (sky image previously masked this by forcing layout).
             */
            contentStyle: { flex: 1, backgroundColor: colors.bg },
            headerTitleStyle: { fontWeight: '600', color: colors.text },
            headerTintColor: colors.text,
            ...(iosMajor >= 26
              ? {}
              : iosMajor > 0
                ? { headerBlurEffect: 'systemChromeMaterial' as const }
                : {}),
          }}
        />
        {/* Deprecated: editing is inline on SubscriptionDetail; screen kept for compatibility. */}
        <Stack.Screen
          name="EditSubscription"
          component={EditSubscriptionScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            headerShown: false,
            contentStyle: { flex: 1 },
          }}
        />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            headerShown: false,
            contentStyle: { flex: 1 },
          }}
        />
      </Stack.Navigator>
    </>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function App() {
  const initializeAuth = useAuthStore((s) => s.initialize);

  useEffect(() => {
    prefetchTabBackground().catch(() => {});
    try {
      adapty.activate('public_live_9sPsrYQj.OGaYn2BE3f44Zb11SphL', {
        __ignoreActivationOnFastRefresh: __DEV__,
      });
    } catch (e) {
      console.warn('Adapty activation error:', e);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return unsubscribe;
  }, [initializeAuth]);

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <NavigationContainer>
        <AppInner />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
