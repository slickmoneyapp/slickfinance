import DateTimePicker from '@react-native-community/datetimepicker';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';
import { colors } from '../ui/theme';

export type AppDateTimePickerProps = ComponentProps<typeof DateTimePicker>;

/**
 * Wraps the community DateTimePicker with our brand accent on iOS (`accentColor` → native tint).
 * Use this everywhere instead of importing DateTimePicker directly so calendars / compact
 * pickers stay purple without duplicating the color.
 */
export function AppDateTimePicker({ accentColor, ...rest }: AppDateTimePickerProps) {
  return (
    <DateTimePicker
      {...rest}
      {...(Platform.OS === 'ios' ? { accentColor: accentColor ?? colors.accent } : {})}
    />
  );
}
