import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, radius } from '../ui/theme';
import { hapticSelection } from '../ui/haptics';

const INK = colors.text;
const DIM = colors.textMuted;

function parseTime(hhmm: string): { h: number; m: number } {
  const [a, b] = hhmm.split(':').map((x) => Number(x));
  const h = Number.isFinite(a) ? Math.min(23, Math.max(0, Math.floor(a!))) : 9;
  const m = Number.isFinite(b) ? Math.min(59, Math.max(0, Math.floor(b!))) : 0;
  return { h, m };
}

type Props = {
  visible: boolean;
  /** "HH:mm" 24h */
  value: string;
  onClose: () => void;
  onSelect: (hhmm: string) => void;
  title?: string;
};

/**
 * Pure RN Modal + scroll lists — no native time picker wheels.
 */
export function TimePickerModal({ visible, value, onClose, onSelect, title = 'Reminder time' }: Props) {
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);

  useEffect(() => {
    if (visible) {
      const { h, m } = parseTime(value);
      setHour(h);
      setMinute(m);
    }
  }, [visible, value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []);

  function confirm() {
    void hapticSelection();
    const hh = String(hour).padStart(2, '0');
    const mm = String(minute).padStart(2, '0');
    onSelect(`${hh}:${mm}`);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.columns}>
            <View style={styles.col}>
              <Text style={styles.colLabel}>Hour</Text>
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {hours.map((h) => (
                  <Pressable
                    key={h}
                    onPress={() => {
                      void hapticSelection();
                      setHour(h);
                    }}
                    style={[styles.item, hour === h && styles.itemSelected]}
                  >
                    <Text style={[styles.itemText, hour === h && styles.itemTextSelected]}>
                      {String(h).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Text style={styles.sep}>:</Text>
            <View style={styles.col}>
              <Text style={styles.colLabel}>Min</Text>
              <ScrollView
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
              >
                {minutes.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => {
                      void hapticSelection();
                      setMinute(m);
                    }}
                    style={[styles.item, minute === m && styles.itemSelected]}
                  >
                    <Text style={[styles.itemText, minute === m && styles.itemTextSelected]}>
                      {String(m).padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          <Pressable onPress={confirm} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: INK },
  closeText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  columns: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 16,
  },
  col: { flex: 1, maxWidth: 120 },
  colLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DIM,
    marginBottom: 6,
    textAlign: 'center',
  },
  scroll: { maxHeight: 220 },
  sep: { fontSize: 28, fontWeight: '700', color: INK, alignSelf: 'center', marginTop: 28 },
  item: {
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  itemSelected: { backgroundColor: 'rgba(11,8,3,0.08)' },
  itemText: { fontSize: 18, fontWeight: '600', color: INK },
  itemTextSelected: { fontWeight: '800' },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
