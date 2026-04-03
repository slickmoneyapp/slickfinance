import React from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { colors, spacing } from '../ui/theme';

export function BudgetScreen() {
  const { height: windowHeight } = useWindowDimensions();
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[
        styles.content,
        { minHeight: Platform.OS === 'ios' ? windowHeight + 1 : windowHeight },
      ]}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
      alwaysBounceVertical
      bounces
    >
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.screenX, paddingTop: 8, paddingBottom: 40, gap: 8, flexGrow: 1 },
  sub: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
});
