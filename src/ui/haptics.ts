import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/** Light tap — pills, list rows, icons, toggles */
export async function hapticSelection(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.selectionAsync();
  } catch {
    /* native module unavailable */
  }
}

/** Primary actions — main CTAs */
export async function hapticImpact(
  style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light,
): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(style);
  } catch {
    /* native module unavailable */
  }
}

/** Stronger feedback — save / confirm */
export async function hapticImpactMedium(): Promise<void> {
  return hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
}
