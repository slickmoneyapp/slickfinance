import { Image } from 'react-native';

/**
 * Single `require` for the sky illustration — import from here only so Metro bundles one copy.
 */
export const TAB_SCREEN_BACKGROUND = require('../../background.png');

/**
 * Warm the native image cache before the first screen paints (call once from `App`).
 * Avoids re-decoding the PNG on every navigation to a screen that uses `TabScreenBackground`.
 */
export function prefetchTabBackground(): Promise<boolean> {
  const resolved = Image.resolveAssetSource(TAB_SCREEN_BACKGROUND);
  const uri = resolved?.uri;
  if (!uri) return Promise.resolve(true);
  return Image.prefetch(uri);
}
