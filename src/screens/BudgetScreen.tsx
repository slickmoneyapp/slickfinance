import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function BudgetScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.wrap}>
        <Text style={styles.title}>Budget</Text>
        <Text style={styles.sub}>Placeholder screen.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F5F5' },
  wrap: { padding: 20, gap: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#0B0803' },
  sub: { fontSize: 15, fontWeight: '600', color: 'rgba(11, 8, 3, 0.6)' },
});

