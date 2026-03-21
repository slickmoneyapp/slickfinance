import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../ui/theme';
import { PageHeader } from '../ui/components';
import { TabScreenBackground } from '../components/TabScreenBackground';

export function BudgetScreen() {
  return (
    <TabScreenBackground variant="figma">
      <View style={styles.wrap}>
        <PageHeader title="Budget" titleVariant="figma" />
        <Text style={styles.sub}>Placeholder screen.</Text>
      </View>
    </TabScreenBackground>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  sub: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
});

