import React from 'react';
import { Image as RNImage, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { TAB_SCREEN_BACKGROUND } from '../assets/tabBackground';
import { colors } from '../ui/theme';

export type TabScreenBackgroundVariant = 'default' | 'figma';

/**
 * Soft sky illustration (`background.png`) behind the safe area — same asset for both variants.
 * `variant` is kept for API compatibility; the visual is always the image + `colors.bg` below.
 */
export function TabScreenBackground({
  children,
  edges = ['top', 'left', 'right'],
  variant: _variant = 'figma',
}: {
  children: React.ReactNode;
  edges?: Edge[];
  variant?: TabScreenBackgroundVariant;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const resolved = RNImage.resolveAssetSource(TAB_SCREEN_BACKGROUND);
  const aspect =
    resolved?.width && resolved?.height ? resolved.height / resolved.width : 0.81;
  const bgHeight = Math.round(screenWidth * aspect);

  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={styles.topIllustration}>
        <Image
          source={TAB_SCREEN_BACKGROUND}
          style={{ width: screenWidth, height: bgHeight }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="tab-screen-bg"
        />
      </View>
      <SafeAreaView style={styles.contentSafe} edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topIllustration: { position: 'absolute', top: 0, left: 0 },
  contentSafe: { flex: 1, backgroundColor: 'transparent' },
});
