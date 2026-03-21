import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

type IonName = ComponentProps<typeof Ionicons>['name'];

/**
 * Maps tab route names to outline / filled glyph variants for the bottom tab bar.
 */
export function getTabBarIconName(routeName: string, focused: boolean): IonName {
  switch (routeName) {
    case 'Home':
      return focused ? 'home' : 'home-outline';
    case 'Budget':
      return focused ? 'pie-chart' : 'pie-chart-outline';
    case 'Subscriptions':
      return focused ? 'card' : 'card-outline';
    case 'Invest':
      return focused ? 'trending-up' : 'trending-up-outline';
    case 'Settings':
      return focused ? 'settings' : 'settings-outline';
    default:
      return focused ? 'settings' : 'settings-outline';
  }
}
