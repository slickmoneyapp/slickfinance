import React, { useEffect, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { colors, radius } from '../ui/theme';
import { hapticSelection } from '../ui/haptics';

const INK = colors.text;

function parseTime(hhmm: string): Date {
  const [a, b] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(Number.isFinite(a) ? a! : 9, Number.isFinite(b) ? b! : 0, 0, 0);
  return d;
}

type Props = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (hhmm: string) => void;
  title?: string;
};

export function TimePickerModal({ visible, value, onClose, onSelect, title = 'Reminder time' }: Props) {
  const [date, setDate] = useState(() => parseTime(value));

  useEffect(() => {
    if (visible) setDate(parseTime(value));
  }, [visible, value]);

  function confirm() {
    void hapticSelection();
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    onSelect(`${hh}:${mm}`);
    onClose();
  }

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={date}
        mode="time"
        is24Hour
        display="default"
        onChange={(_, selected) => {
          onClose();
          if (selected) {
            const hh = String(selected.getHours()).padStart(2, '0');
            const mm = String(selected.getMinutes()).padStart(2, '0');
            onSelect(`${hh}:${mm}`);
          }
        }}
      />
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>
          <DateTimePicker
            value={date}
            mode="time"
            display="spinner"
            is24Hour
            onChange={(_, selected) => {
              if (selected) setDate(selected);
            }}
            style={styles.picker}
            themeVariant="light"
          />
          <Pressable onPress={confirm} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Done</Text>
          </Pressable>
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
  picker: { height: 180 },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});
