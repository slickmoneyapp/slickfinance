import React from 'react';
import { Image as RNImage, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Image } from 'expo-image';
import { TAB_SCREEN_BACKGROUND } from '../assets/tabBackground';
import { colors } from '../ui/theme';

/**
 * Sky illustration rendered as an absolutely-positioned layer **inside** a ScrollView.
 *
 * Place this as the first child of every tab screen's ScrollView / FlatList header.
 * It is absolutely positioned so it does not affect content layout, and sits behind
 * the content (content paints on top).
 *
 * The image is placed at `top: 0` relative to the scroll content. With
 * `contentInsetAdjustmentBehavior="automatic"`, content starts below the transparent
 * navigation bar, so the image appears right below the header and scrolls with content.
 */
export function ScreenBgImage() {
  const { width: screenWidth } = useWindowDimensions();
  const resolved = RNImage.resolveAssetSource(TAB_SCREEN_BACKGROUND);
  const aspect =
    resolved?.width && resolved?.height ? resolved.height / resolved.width : 0.81;
  const bgHeight = Math.round(screenWidth * aspect);

  return (
    <View style={[styles.container, { width: screenWidth, height: bgHeight }]} pointerEvents="none">
      <Image
        source={TAB_SCREEN_BACKGROUND}
        style={{ width: screenWidth, height: bgHeight }}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        recyclingKey="tab-screen-bg"
      />
    </View>
  );
}

export type TabScreenBackgroundVariant = 'default' | 'figma';

/**
 * Backward-compatible wrapper for non-tab screens (modals, detail views) that don't need
 * the native large-title collapse. Renders the sky image behind children in a plain View.
 */
export function TabScreenBackground({
  children,
}: {
  children: React.ReactNode;
  edges?: readonly string[];
  disableSafeAreaView?: boolean;
  variant?: TabScreenBackgroundVariant;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const resolved = RNImage.resolveAssetSource(TAB_SCREEN_BACKGROUND);
  const aspect =
    resolved?.width && resolved?.height ? resolved.height / resolved.width : 0.81;
  const bgHeight = Math.round(screenWidth * aspect);

  return (
    <View style={wrapperStyles.root}>
      <View pointerEvents="none" style={wrapperStyles.topIllustration}>
        <Image
          source={TAB_SCREEN_BACKGROUND}
          style={{ width: screenWidth, height: bgHeight }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="tab-screen-bg"
        />
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: -1,
  },
});

const wrapperStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  topIllustration: { position: 'absolute', top: 0, left: 0 },
});
