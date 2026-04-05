import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { AppDateTimePicker } from './AppDateTimePicker';
import { colors, radius } from '../ui/theme';

const INK = colors.text;

type Props = {
  visible: boolean;
  value: Date;
  onClose: () => void;
  onSelect: (date: Date) => void;
  title?: string;
};

export function DatePickerModal({ visible, value, onClose, onSelect, title = 'Payment date' }: Props) {
  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <AppDateTimePicker
        value={value}
        mode="date"
        display="default"
        onChange={(_, selected) => {
          onClose();
          if (selected) onSelect(selected);
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
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <AppDateTimePicker
            value={value}
            mode="date"
            display="inline"
            onChange={(_, selected) => {
              if (selected) onSelect(selected);
            }}
            style={styles.picker}
            themeVariant="light"
          />
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
    marginBottom: 8,
  },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: INK },
  doneText: { fontSize: 16, fontWeight: '600', color: colors.primary },
  picker: { height: 340 },
});
