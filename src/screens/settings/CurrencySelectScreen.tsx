import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../App';
import { buildCurrencyOptions, type CurrencyOption } from '../../features/settings/currencies';
import { useSettingsStore } from '../../features/settings/store';
import { hapticSelection } from '../../ui/haptics';
import { AppScreen, IconCircleButton, ScreenHeader } from '../../ui/components';
import { colors, spacing } from '../../ui/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'CurrencySelect'>;

export function CurrencySelectScreen({ navigation }: Props) {
  const selected = useSettingsStore((s) => s.preferredCurrency);
  const setPreferredCurrency = useSettingsStore((s) => s.setPreferredCurrency);
  const [q, setQ] = useState('');

  const all = useMemo(() => buildCurrencyOptions(), []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = !needle
      ? all
      : all.filter((c) => {
        const hay = `${c.code} ${c.symbol ?? ''} ${c.countries.join(' ')}`.toLowerCase();
        return hay.includes(needle);
      });
    const idx = base.findIndex((c) => c.code === selected);
    if (idx <= 0) return base;
    return [base[idx], ...base.slice(0, idx), ...base.slice(idx + 1)];
  }, [all, q, selected]);

  return (
    <AppScreen edges={['top', 'left', 'right', 'bottom']}>
      <ScreenHeader
        title="Preferred Currency"
        left={<IconCircleButton icon="chevron-back" onPress={() => navigation.goBack()} />}
      />

      <View style={{ paddingHorizontal: spacing.screenX, paddingTop: 8, paddingBottom: 12 }}>
        <View style={s.searchShell}>
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Search currency…"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            style={s.searchInput}
          />
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: spacing.screenX, paddingTop: 0, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={s.listCard}>
          {filtered.map((c: CurrencyOption, idx) => {
            const label = c.symbol ? `${c.symbol} ${c.code}` : c.code;
            return (
              <View key={c.code}>
                {idx > 0 ? <View style={s.sep} /> : null}
                <Pressable
                  onPress={() => {
                    void hapticSelection();
                    void setPreferredCurrency(c.code);
                  }}
                  style={({ pressed }) => [s.row, pressed && s.pressed]}
                >
                  <View style={s.left}>
                    <Text style={s.flag}>{c.flag}</Text>
                    <Text style={s.text} numberOfLines={1}>
                      {label}
                    </Text>
                  </View>
                  {c.code === selected ? <Text style={s.check}>Selected</Text> : null}
                </Pressable>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </AppScreen>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: 0.75 },
  searchShell: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  searchInput: { fontSize: 15, fontWeight: '600', color: colors.text, paddingVertical: 10 },
  listCard: { backgroundColor: colors.surface, borderRadius: 18, overflow: 'hidden' },
  row: {
    minHeight: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  left: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 12 },
  flag: { fontSize: 16 },
  text: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderSubtle, marginLeft: 16 },
  check: { fontSize: 12, fontWeight: '700', color: colors.textMuted },
});

