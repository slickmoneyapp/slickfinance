import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  adapty,
  type AdaptyPaywall,
  type AdaptyPaywallProduct,
} from 'react-native-adapty';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { usePremiumStore } from '../features/premium/store';
import { colors } from '../ui/theme';

const PLACEMENT_ID = 'Standard';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [products, setProducts] = useState<AdaptyPaywallProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const checkAccess = usePremiumStore((s) => s.checkAccess);

  useEffect(() => {
    (async () => {
      try {
        const paywall: AdaptyPaywall = await adapty.getPaywall(PLACEMENT_ID);
        const prods = await adapty.getPaywallProducts(paywall);
        setProducts(prods);
        if (prods.length > 0) setSelectedIdx(0);
      } catch (e: any) {
        console.warn('Paywall load error:', e);
        Alert.alert('Error', 'Could not load subscription options.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [navigation]);

  async function handlePurchase() {
    const product = products[selectedIdx];
    if (!product || purchasing) return;
    setPurchasing(true);
    try {
      const result = await adapty.makePurchase(product);
      switch (result.type) {
        case 'success':
          await checkAccess();
          navigation.goBack();
          break;
        case 'user_cancelled':
          break;
        case 'pending':
          Alert.alert('Pending', 'Your purchase is being processed.');
          break;
      }
    } catch (e: any) {
      Alert.alert('Purchase Error', e.message ?? 'Something went wrong.');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    if (purchasing) return;
    setPurchasing(true);
    try {
      const profile = await adapty.restorePurchases();
      const hasAccess = profile.accessLevels?.['premium']?.isActive === true;
      if (hasAccess) {
        await checkAccess();
        Alert.alert('Restored', 'Your subscription has been restored.');
        navigation.goBack();
      } else {
        Alert.alert('Nothing to Restore', 'No active subscription found.');
      }
    } catch (e: any) {
      Alert.alert('Restore Error', e.message ?? 'Something went wrong.');
    } finally {
      setPurchasing(false);
    }
  }

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {purchasing && (
        <View style={s.overlay}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      )}

      {/* Close */}
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={12}
        style={({ pressed }) => [s.closeBtn, pressed && s.pressed]}
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </Pressable>

      {/* Hero */}
      <View style={s.hero}>
        <View style={s.iconCircle}>
          <Ionicons name="diamond" size={40} color="#CB30E0" />
        </View>
        <Text style={s.title}>Go Premium</Text>
        <Text style={s.subtitle}>
          Unlock all features and take{'\n'}full control of your finances
        </Text>
      </View>

      {/* Features */}
      <View style={s.features}>
        {[
          { icon: 'infinite-outline' as const, text: 'Unlimited subscriptions' },
          { icon: 'notifications-outline' as const, text: 'Smart reminders' },
          { icon: 'analytics-outline' as const, text: 'Advanced analytics' },
          { icon: 'shield-checkmark-outline' as const, text: 'Priority support' },
        ].map((f) => (
          <View key={f.text} style={s.featureRow}>
            <Ionicons name={f.icon} size={20} color="#CB30E0" />
            <Text style={s.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>

      {/* Products */}
      <ScrollView
        style={s.productsScroll}
        contentContainerStyle={s.productsContainer}
        showsVerticalScrollIndicator={false}
      >
        {products.map((product, idx) => {
          const selected = idx === selectedIdx;
          const price = product.price?.localizedString ?? '';
          const period = product.subscriptionDetails?.subscriptionPeriod;
          let periodLabel = '';
          if (period) {
            if (period.unit === 'year') periodLabel = '/ year';
            else if (period.unit === 'month' && period.numberOfUnits === 1) periodLabel = '/ month';
            else if (period.unit === 'week') periodLabel = '/ week';
            else periodLabel = `/ ${period.numberOfUnits} ${period.unit}s`;
          }

          return (
            <Pressable
              key={product.vendorProductId}
              onPress={() => setSelectedIdx(idx)}
              style={[s.productCard, selected && s.productCardSelected]}
            >
              <View style={[s.radio, selected && s.radioSelected]}>
                {selected && <View style={s.radioDot} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[s.productTitle, selected && s.productTitleSelected]}>
                  {product.localizedTitle || product.vendorProductId}
                </Text>
                {product.localizedDescription ? (
                  <Text style={s.productDesc}>{product.localizedDescription}</Text>
                ) : null}
              </View>
              <Text style={[s.productPrice, selected && s.productPriceSelected]}>
                {price} {periodLabel}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Actions */}
      <View style={s.actions}>
        <Pressable
          onPress={handlePurchase}
          disabled={purchasing || products.length === 0}
          style={({ pressed }) => [s.purchaseBtn, pressed && s.pressed, purchasing && { opacity: 0.5 }]}
        >
          <Text style={s.purchaseBtnText}>Subscribe</Text>
        </Pressable>

        <Pressable onPress={handleRestore} disabled={purchasing} style={({ pressed }) => [pressed && s.pressed]}>
          <Text style={s.restoreText}>Restore Purchases</Text>
        </Pressable>

        <Text style={s.legal}>
          Payment will be charged to your Apple ID account. Subscription automatically renews unless canceled at least 24 hours before the end of the current period.
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,245,245,0.7)',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },

  closeBtn: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 5,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  hero: {
    alignItems: 'center',
    marginTop: 48,
    paddingHorizontal: 32,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(203,48,224,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 32,
    letterSpacing: -0.8,
    color: colors.text,
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: 'center',
  },

  features: {
    width: '100%',
    paddingHorizontal: 40,
    marginTop: 28,
    gap: 14,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },

  productsScroll: {
    width: '100%',
    maxHeight: 200,
    marginTop: 28,
  },
  productsContainer: {
    paddingHorizontal: 20,
    gap: 10,
  },

  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  productCardSelected: {
    borderColor: '#CB30E0',
    backgroundColor: 'rgba(203,48,224,0.04)',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D0D0D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#CB30E0',
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#CB30E0',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  productTitleSelected: {
    color: '#CB30E0',
  },
  productDesc: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  productPriceSelected: {
    color: '#CB30E0',
  },

  actions: {
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 12,
    marginTop: 'auto',
    gap: 12,
    alignItems: 'center',
  },
  purchaseBtn: {
    width: '100%',
    height: 54,
    borderRadius: 999,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  purchaseBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  restoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMuted,
  },
  legal: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 15,
  },
});
