import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from './src/screens/HomeScreen';
import { BudgetScreen } from './src/screens/BudgetScreen';
import { SubscriptionsScreen } from './src/screens/SubscriptionsScreen';
import { InvestScreen } from './src/screens/InvestScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AddSubscriptionScreen } from './src/screens/AddSubscriptionScreen';
import { SubscriptionDetailScreen } from './src/screens/SubscriptionDetailScreen';
import { EditSubscriptionScreen } from './src/screens/EditSubscriptionScreen';
import { useNotificationSync } from './src/hooks/useNotificationSync';

export type RootTabsParamList = {
  Home: undefined;
  Budget: undefined;
  Subscriptions: undefined;
  Invest: undefined;
  Settings: undefined;
};

const Tabs = createBottomTabNavigator<RootTabsParamList>();
export type RootStackParamList = {
  Tabs: undefined;
  AddSubscription: undefined;
  SubscriptionDetail: { subscriptionId: string };
  EditSubscription: { subscriptionId: string };
};
const Stack = createNativeStackNavigator<RootStackParamList>();

function AppInner() {
  useNotificationSync();
  return (
    <>
      <StatusBar style="dark" />
      <Stack.Navigator>
        <Stack.Screen name="Tabs" component={RootTabs} options={{ headerShown: false }} />
        <Stack.Screen
          name="AddSubscription"
          component={AddSubscriptionScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="SubscriptionDetail"
          component={SubscriptionDetailScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="EditSubscription"
          component={EditSubscriptionScreen}
          options={{ presentation: 'modal', headerShown: false }}
        />
      </Stack.Navigator>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <AppInner />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function RootTabs() {
  const insets = useSafeAreaInsets();
  const bottomGap = Math.max(10, insets.bottom);
  const floatingBottom = 8;
  const barHeight = 62 + bottomGap;

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#CB30E0',
        tabBarInactiveTintColor: '#8C8C8C',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarStyle: [styles.tabBar, { bottom: floatingBottom, height: barHeight, paddingBottom: bottomGap - 2 }],
        tabBarItemStyle: styles.tabItem,
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView intensity={Platform.OS === 'ios' ? 55 : 35} tint="light" style={StyleSheet.absoluteFill} />
            <View style={styles.tabBarTint} />
          </View>
        ),
        tabBarIcon: ({ color, size, focused }) => {
          const icon =
            route.name === 'Home'
              ? focused ? 'home' : 'home-outline'
              : route.name === 'Budget'
                ? focused ? 'pie-chart' : 'pie-chart-outline'
                : route.name === 'Subscriptions'
                  ? focused ? 'card' : 'card-outline'
                  : route.name === 'Settings'
                    ? focused ? 'settings' : 'settings-outline'
                    : focused ? 'trending-up' : 'trending-up-outline';
          return <Ionicons name={icon as any} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} />
      <Tabs.Screen name="Budget" component={BudgetScreen} />
      <Tabs.Screen name="Subscriptions" component={SubscriptionsScreen} />
      <Tabs.Screen name="Invest" component={InvestScreen} />
      <Tabs.Screen name="Settings" component={SettingsScreen} />
    </Tabs.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    borderRadius: 30,
    borderTopWidth: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
    // keep it above the home indicator area; height/padding set dynamically
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  tabBarTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  tabItem: {
    paddingTop: 6,
    paddingBottom: 6,
  },
});
