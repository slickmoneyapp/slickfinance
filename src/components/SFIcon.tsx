import React from 'react';
import { Platform, View, type ColorValue, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

type SymbolWeight =
  | 'ultraLight'
  | 'thin'
  | 'light'
  | 'regular'
  | 'medium'
  | 'semibold'
  | 'bold'
  | 'heavy'
  | 'black';

export function SFIcon({
  name,
  size = 20,
  color = '#000000',
  weight = 'medium',
  style,
}: {
  name: string;
  size?: number;
  color?: ColorValue;
  weight?: SymbolWeight;
  style?: ViewStyle;
}) {
  if (Platform.OS !== 'ios') {
    return <View style={[{ width: size, height: size }, style]} />;
  }

  return (
    <SymbolView
      name={name}
      style={[{ width: size, height: size }, style]}
      tintColor={color}
      weight={weight}
      resizeMode="scaleAspectFit"
    />
  );
}
