import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../ui/theme';
import { hapticSelection } from '../ui/haptics';

const INK = colors.text;
const DIM = colors.textMuted;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstWeekday(y: number, m: number) {
  return (new Date(y, m, 1).getDay() + 6) % 7;
}

type Props = {
  visible: boolean;
  /** Current selection (local date) */
  value: Date;
  onClose: () => void;
  /** Called when user confirms a calendar day */
  onSelect: (date: Date) => void;
  title?: string;
};

/**
 * Pure RN Modal + calendar grid — no native UIDatePicker / Android date dialogs.
 */
export function DatePickerModal({ visible, value, onClose, onSelect, title = 'Payment date' }: Props) {
  const { width } = useWindowDimensions();
  const padX = 20;
  const cell = Math.floor((width - padX * 2 - 32) / 7);

  const [year, setYear] = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());

  useEffect(() => {
    if (visible) {
      setYear(value.getFullYear());
      setMonth(value.getMonth());
    }
  }, [visible, value]);

  const cells = useMemo(() => {
    const first = getFirstWeekday(year, month);
    const dim = getDaysInMonth(year, month);
    const out: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: dim }, (_, i) => i + 1)];
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [year, month]);

  const selectedY = value.getFullYear();
  const selectedM = value.getMonth();
  const selectedD = value.getDate();

  function pickDay(day: number) {
    void hapticSelection();
    const d = new Date(year, month, day, 12, 0, 0, 0);
    onSelect(d);
    onClose();
  }

  function prevMonth() {
    void hapticSelection();
    if (month === 0) {
      setYear((y) => y - 1);
      setMonth(11);
    } else setMonth((m) => m - 1);
  }
  function nextMonth() {
    void hapticSelection();
    if (month === 11) {
      setYear((y) => y + 1);
      setMonth(0);
    } else setMonth((m) => m + 1);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.doneText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.navRow}>
            <Pressable onPress={prevMonth} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={22} color={INK} />
            </Pressable>
            <Text style={styles.monthTitle}>
              {MONTHS[month]} {year}
            </Text>
            <Pressable onPress={nextMonth} style={styles.navBtn}>
              <Ionicons name="chevron-forward" size={22} color={INK} />
            </Pressable>
          </View>

          <View style={styles.dayRow}>
            {DAYS.map((d) => (
              <Text key={d} style={[styles.dayLabel, { width: cell }]}>
                {d}
              </Text>
            ))}
          </View>

          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.gridRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                const key = `${row}-${col}`;
                if (day == null) return <View key={key} style={{ width: cell, height: cell }} />;
                const isSel = year === selectedY && month === selectedM && day === selectedD;
                return (
                  <Pressable
                    key={key}
                    onPress={() => pickDay(day)}
                    style={[
                      styles.cell,
                      { width: cell, height: cell },
                      isSel && styles.cellSelected,
                    ]}
                  >
                    <Text style={[styles.cellText, isSel && styles.cellTextSelected]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.75 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    paddingVertical: 16,
    paddingHorizontal: 12,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: INK },
  doneText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 8 },
  monthTitle: { fontSize: 16, fontWeight: '700', color: INK },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  dayLabel: {
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '600',
    color: DIM,
  },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  cellSelected: { backgroundColor: colors.primary },
  cellText: { fontSize: 15, fontWeight: '600', color: INK },
  cellTextSelected: { color: '#FFF' },
});
