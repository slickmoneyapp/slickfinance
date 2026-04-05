import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

const inAppBrowserOptions: WebBrowser.WebBrowserOpenOptions = {
  presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
  dismissButtonStyle: 'done',
};

/**
 * Opens http(s) and other browsable URLs in an in-app browser (SFSafariViewController on iOS,
 * Chrome Custom Tabs on Android). Use for legal pages, marketing links, and store web URLs.
 * `mailto:`, `tel:`, and `sms:` still open the system handlers.
 */
export async function openUrlInApp(url: string): Promise<void> {
  const trimmed = url.trim();
  if (!trimmed) return;

  const scheme = trimmed.split(':')[0]?.toLowerCase() ?? '';
  if (scheme === 'mailto' || scheme === 'tel' || scheme === 'sms') {
    const can = await Linking.canOpenURL(trimmed);
    if (can) await Linking.openURL(trimmed);
    return;
  }

  await WebBrowser.openBrowserAsync(trimmed, inAppBrowserOptions);
}
