import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { Platform, Pressable } from 'react-native';
import { useFonts, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import { adapty } from 'react-native-adapty';

import { SubscriptionsSkeleton } from './src/components/Skeleton';
import { SFIcon } from './src/components/SFIcon';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { SubscriptionsScreen } from './src/screens/SubscriptionsScreen';
import { InvestScreen } from './src/screens/InvestScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import {
  ENABLE_BUDGET_TAB,
  ENABLE_INVEST_TAB,
} from './src/config/featureFlags';
import { AddSubscriptionScreen } from './src/screens/AddSubscriptionScreen';
import { SubscriptionDetailScreen } from './src/screens/SubscriptionDetailScreen';
import { EditSubscriptionScreen } from './src/screens/EditSubscriptionScreen';
import { PaywallScreen } from './src/screens/PaywallScreen';
import { useNotificationSync } from './src/hooks/useNotificationSync';
import { prefetchTabBackground } from './src/assets/tabBackground';
import { useAuthStore } from './src/features/auth/store';
import { useSubscriptionsStore } from './src/features/subscriptions/store';
import { usePremiumStore } from './src/features/premium/store';
import { navigateRoot } from './src/navigation/navigateRoot';
import { hapticImpact } from './src/ui/haptics';

export type RootTabsParamList = {
  Subscriptions: undefined;
  Budget: undefined;
  Invest: undefined;
  Settings: undefined;
};

const Tabs = createNativeBottomTabNavigator<RootTabsParamList>();
export type RootStackParamList = {
  Tabs: undefined;
  AddSubscription: undefined;
  SubscriptionDetail: { subscriptionId: string };
  EditSubscription: { subscriptionId: string };
  Paywall: undefined;
};
const Stack = createNativeStackNavigator<RootStackParamList>();

type SubsStackParamList = { SubscriptionsList: undefined };
const SubsStack = createNativeStackNavigator<SubsStackParamList>();

function SubscriptionsStackScreen() {
  return (
    <SubsStack.Navigator>
      <SubsStack.Screen
        name="SubscriptionsList"
        component={SubscriptionsScreen}
        options={({ navigation }) => ({
          title: 'Subscriptions',
          headerLargeTitle: true,
          headerTransparent: true,
          headerLargeStyle: { backgroundColor: 'transparent' },
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => {
                void hapticImpact();
                navigateRoot(navigation as any, 'AddSubscription');
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Add subscription"
              style={{ paddingHorizontal: 2, paddingVertical: 2 }}
            >
              <SFIcon name="plus" size={20} color="#007AFF" weight="semibold" />
            </Pressable>
          ),
        })}
      />
    </SubsStack.Navigator>
  );
}

type BudgetStackParamList = { BudgetMain: undefined };
const BudgetStack = createNativeStackNavigator<BudgetStackParamList>();

function BudgetStackScreen() {
  return (
    <BudgetStack.Navigator>
      <BudgetStack.Screen
        name="BudgetMain"
        component={BudgetScreen}
        options={{
          title: 'Budget',
          headerLargeTitle: true,
          headerTransparent: true,
          headerLargeStyle: { backgroundColor: 'transparent' },
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
        }}
      />
    </BudgetStack.Navigator>
  );
}

type InvestStackParamList = { InvestMain: undefined };
const InvestStack = createNativeStackNavigator<InvestStackParamList>();

function InvestStackScreen() {
  return (
    <InvestStack.Navigator>
      <InvestStack.Screen
        name="InvestMain"
        component={InvestScreen}
        options={{
          title: 'Invest',
          headerLargeTitle: true,
          headerTransparent: true,
          headerLargeStyle: { backgroundColor: 'transparent' },
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
        }}
      />
    </InvestStack.Navigator>
  );
}

type ProfileStackParamList = { ProfileMain: undefined };
const ProfileStack = createNativeStackNavigator<ProfileStackParamList>();

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen
        name="ProfileMain"
        component={SettingsScreen}
        options={{
          title: 'Profile',
          headerLargeTitle: true,
          headerTransparent: true,
          headerLargeStyle: { backgroundColor: 'transparent' },
          headerStyle: { backgroundColor: 'transparent' },
          headerShadowVisible: false,
        }}
      />
    </ProfileStack.Navigator>
  );
}

function AppInner() {
  const [fontsLoaded] = useFonts({ BricolageGrotesque_800ExtraBold });
  const session = useAuthStore((s) => s.session);
  const initialized = useAuthStore((s) => s.initialized);
  const initializeSubs = useSubscriptionsStore((s) => s.initialize);
  const checkAccess = usePremiumStore((s) => s.checkAccess);
  const setIsPremium = usePremiumStore((s) => s.setIsPremium);
  useNotificationSync();

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
    return () => { listener.remove(); };
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
        <Stack.Screen name="Tabs" component={RootTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddSubscription"
          component={AddSubscriptionScreen}
          options={{
            presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
            headerShown: false,
            contentStyle: { flex: 1 },
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
          }}
        />
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
    <SafeAreaProvider>
      <NavigationContainer>
        <AppInner />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function RootTabs() {
  return (
    <Tabs.Navigator
      tabBarActiveTintColor="#CB30E0"
      tabBarInactiveTintColor="#8C8C8C"
    >
      <Tabs.Screen
        name="Subscriptions"
        component={SubscriptionsStackScreen}
        options={{
          tabBarIcon: () => ({ sfSymbol: 'creditcard' }),
        }}
      />
      {ENABLE_BUDGET_TAB ? (
        <Tabs.Screen
          name="Budget"
          component={BudgetStackScreen}
          options={{
            tabBarIcon: () => ({ sfSymbol: 'chart.pie' }),
          }}
        />
      ) : null}
      {ENABLE_INVEST_TAB ? (
        <Tabs.Screen
          name="Invest"
          component={InvestStackScreen}
          options={{
            tabBarIcon: () => ({ sfSymbol: 'chart.line.uptrend.xyaxis' as any }),
          }}
        />
      ) : null}
      <Tabs.Screen
        name="Settings"
        component={ProfileStackScreen}
        options={{
          title: 'Profile',
          tabBarIcon: () => ({ sfSymbol: 'person.circle' }),
        }}
      />
    </Tabs.Navigator>
  );
}
