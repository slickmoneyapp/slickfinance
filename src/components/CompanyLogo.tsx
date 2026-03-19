import React, { memo, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { buildLogoDevUrl } from '../utils/logoDev';

// Publishable key — safe to ship in client code.
// Falls back to env var so it can be overridden without a code change.
const LOGODEV_TOKEN =
  (process.env.EXPO_PUBLIC_LOGODEV_TOKEN as string | undefined) ??
  'pk_SQVsaKc_RfuK49MneNGgxw';

type Props = {
  domain: string;
  size: number;
  rounded?: number;
  fallbackText?: string;
};

export const CompanyLogo = memo(function CompanyLogo({
  domain,
  size,
  rounded = 14,
  fallbackText,
}: Props) {
  const [failed, setFailed] = useState(false);

  const safeDomain = domain.trim().toLowerCase();
  const monogram = ((fallbackText ?? safeDomain)[0] ?? '?').toUpperCase();

  // Logo.dev returns a 404 image when not found — we detect that via onError
  const uri = useMemo(
    () =>
      buildLogoDevUrl({
        domain: safeDomain,
        token: LOGODEV_TOKEN,
        // Logo.dev sizes: 16, 32, 64, 128, 256
        size: size >= 128 ? 128 : size >= 64 ? 64 : size >= 32 ? 32 : 16,
        format: 'png',
        // App is locked to light mode (userInterfaceStyle: "light" in app.json)
        theme: 'light',
        retina: true,
        fallback: '404',
      }),
    [safeDomain, size],
  );

  if (failed) {
    return <Monogram letter={monogram} size={size} rounded={rounded} />;
  }

  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: rounded }}
      resizeMode="contain"
      onError={() => setFailed(true)}
    />
  );
});

function Monogram({
  letter,
  size,
  rounded,
}: {
  letter: string;
  size: number;
  rounded: number;
}) {
  const fontSize = Math.round(size * 0.42);
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: rounded },
      ]}
    >
      <Text style={[styles.fallbackText, { fontSize }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(11,8,3,0.06)',
  },
  fallbackText: {
    fontWeight: '800',
    color: 'rgba(11,8,3,0.65)',
  },
});
