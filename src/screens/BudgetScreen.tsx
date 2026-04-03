import React from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { colors, spacing } from '../ui/theme';
import { TabScreenBackground } from '../components/TabScreenBackground';

export function BudgetScreen() {
  return (
    <TabScreenBackground variant="figma" edges={['left', 'right', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <Text style={styles.sub}>Placeholder screen.</Text>
      </ScrollView>
    </TabScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.screenX, paddingTop: 8, paddingBottom: 40, gap: 8 },
  sub: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
});

