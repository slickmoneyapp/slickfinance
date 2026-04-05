import React from 'react';
import { StyleSheet, View } from 'react-native';

type Props = {
  /** Number of pages (dots). */
  count: number;
  /** Zero-based index of the current page. */
  currentIndex: number;
};

/**
 * Visual match for iOS `UIPageControl` default styling (compact dots).
 * See [Human Interface Guidelines — Page controls](https://developer.apple.com/design/human-interface-guidelines/page-controls).
 */
export function IosPageControl({ count, currentIndex }: Props) {
  return (
    <View
      style={styles.row}
      accessibilityRole="tablist"
      accessibilityLabel={`Page ${currentIndex + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => {
        const active = i === currentIndex;
        return (
          <View
            key={i}
            style={[styles.dot, active ? styles.dotActive : styles.dotInactive]}
          />
        );
      })}
    </View>
  );
}

/** ~7pt dot, ~8pt spacing — typical for UIPageControl compact style. */
const DOT = 7;
const GAP = 8;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GAP,
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  dotActive: {
    backgroundColor: '#000000',
  },
  dotInactive: {
    backgroundColor: 'rgba(60, 60, 67, 0.36)',
  },
});
