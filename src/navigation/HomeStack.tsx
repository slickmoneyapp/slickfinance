import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeScreen } from '../screens/HomeScreen';
import { getHomeNativeHeaderOptions } from './homeStackOptions';

export type HomeStackParamList = {
  HomeMain: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

/**
 * Home tab wraps content in a native stack so iOS gets `headerLargeTitle` + scroll collapse.
 */
export function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={getHomeNativeHeaderOptions()}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
    </Stack.Navigator>
  );
}
