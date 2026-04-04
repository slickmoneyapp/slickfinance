import React from 'react';
import { Platform, StyleSheet, Text } from 'react-native';
import { HeaderButton } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import type { Subscription } from '../features/subscriptions/types';
import { stackHeaderLargeTitleStyle } from '../constants/fonts';
import { colors } from '../ui/theme';
import { AddSubscriptionPickerScreen } from '../screens/AddSubscriptionPickerScreen';
import { AddSubscriptionFormScreen } from '../screens/AddSubscriptionFormScreen';

export type AddSubscriptionStackParamList = {
  AddSubscriptionPicker: undefined;
  AddSubscriptionForm: {
    serviceName: string;
    domain: string;
    category: Subscription['category'];
  };
};

const Stack = createNativeStackNavigator<AddSubscriptionStackParamList>();

const iosMajor = Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) : 0;

/** Matches App root stack chrome so the picker bar aligns with the rest of the app */
const addSubscriptionPickerNativeHeaderOptions: NativeStackNavigationOptions = {
  headerShown: true,
  title: 'Add Subscription',
  headerLargeTitle: true,
  headerBackVisible: false,
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
  contentStyle: { flex: 1, backgroundColor: colors.bg },
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

export function AddSubscriptionStackNavigator() {
  return (
    <Stack.Navigator initialRouteName="AddSubscriptionPicker" screenOptions={{ animation: 'default' }}>
      <Stack.Screen
        name="AddSubscriptionPicker"
        component={AddSubscriptionPickerScreen}
        options={({ navigation }) => ({
          ...addSubscriptionPickerNativeHeaderOptions,
          headerLeft: () => (
            <HeaderButton
              accessibilityLabel="Cancel"
              onPress={() => {
                navigation.getParent()?.goBack();
              }}
            >
              <Text style={cancelLabelStyle}>Cancel</Text>
            </HeaderButton>
          ),
        })}
      />
      <Stack.Screen
        name="AddSubscriptionForm"
        component={AddSubscriptionFormScreen}
        options={{
          headerShown: false,
          contentStyle: { flex: 1, backgroundColor: colors.bg },
        }}
      />
    </Stack.Navigator>
  );
}

const cancelLabelStyle = StyleSheet.create({
  label: { fontSize: 17, fontWeight: '400', color: '#007AFF' },
}).label;
