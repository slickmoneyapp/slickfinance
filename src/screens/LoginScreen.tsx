import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image as RNImage,
  Linking,
  type NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import { makeRedirectUri } from 'expo-auth-session';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { SvgXml } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GOOGLE_G_COLOR_LOGO_XML } from '../assets/googleGColorLogoXml';
import { SPLASH_LOGO_MARK_XML } from '../assets/splashLogoMarkXml';
import { TAB_SCREEN_BACKGROUND } from '../assets/tabBackground';
import { BRICOLAGE_GROTESQUE_EXTRA_BOLD } from '../constants/fonts';
import { PRIVACY_URL, TERMS_URL } from '../constants/legalUrls';
import { IosPageControl } from '../components/IosPageControl';
import { SFIcon } from '../components/SFIcon';
import { useAuthStore } from '../features/auth/store';
import { supabase } from '../lib/supabase';
import { colors, sheetTypography } from '../ui/theme';

import { LOGIN_ONBOARDING_SLIDES } from './loginOnboardingSlides';

WebBrowser.maybeCompleteAuthSession();

/** Matches SVG viewBox `0 0 211 40`. */
const VIEWBOX_W = 211;
const VIEWBOX_H = 40;
const SPLASH_LOGO_HEIGHT = 40;
const HEADER_LOGO_HEIGHT = 32;
const SPLASH_LOGO_WIDTH = SPLASH_LOGO_HEIGHT * (VIEWBOX_W / VIEWBOX_H);

/** Cold-launch splash only (sign-out skips this). */
const SPLASH_HOLD_MS = 1200;
const TRANSITION_MS = 680;
const LOGO_FADE_IN_MS = 380;
const LOGIN_UI_FADE_MS = 420;
const FINAL_TOP_GAP = 14;
const CONTENT_BELOW_LOGO_GAP = 20;
/** Reserved height per slide for hero illustrations (replace with assets later). */
const SLIDE_ILLUSTRATION_MIN_HEIGHT = 168;

export function LoginScreen() {
  const { width: screenWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [pagerPage, setPagerPage] = useState(0);
  const setCurrentProvider = useAuthStore((s) => s.setCurrentProvider);

  const resolvedBg = RNImage.resolveAssetSource(TAB_SCREEN_BACKGROUND);
  const bgAspect =
    resolvedBg?.width && resolvedBg?.height
      ? resolvedBg.height / resolvedBg.width
      : 0.81;
  const bgHeight = Math.round(screenWidth * bgAspect);

  const finalTop = insets.top + FINAL_TOP_GAP;
  const centerOffsetY =
    windowHeight / 2 - SPLASH_LOGO_HEIGHT / 2 - finalTop;
  const headerScale = HEADER_LOGO_HEIGHT / SPLASH_LOGO_HEIGHT;

  const contentPaddingTop =
    finalTop + HEADER_LOGO_HEIGHT + CONTENT_BELOW_LOGO_GAP;
  /** Full-bleed pager; inner copy uses this so text stays off the edges. */
  const slideWidth = screenWidth;
  const slidePadLeft = Math.max(32, insets.left);
  const slidePadRight = Math.max(32, insets.right);

  const translateY = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1)).current;
  const logoFade = useRef(new Animated.Value(0)).current;
  const loginUiOpacity = useRef(new Animated.Value(0)).current;
  const splashInitDoneRef = useRef(false);
  const runSplashSequenceRef = useRef(false);

  useLayoutEffect(() => {
    if (splashInitDoneRef.current) return;
    splashInitDoneRef.current = true;

    const skip = useAuthStore.getState().skipLoginSplashOnce;
    if (skip) {
      useAuthStore.getState().consumeLoginSplashSkip();
      translateY.setValue(0);
      logoScale.setValue(headerScale);
      logoFade.setValue(1);
      loginUiOpacity.setValue(1);
      runSplashSequenceRef.current = false;
      return;
    }

    translateY.setValue(centerOffsetY);
    logoScale.setValue(1);
    logoFade.setValue(0);
    loginUiOpacity.setValue(0);
    runSplashSequenceRef.current = true;
  }, [centerOffsetY, headerScale, translateY, logoScale, logoFade, loginUiOpacity]);

  useEffect(() => {
    if (!runSplashSequenceRef.current) return;

    Animated.timing(logoFade, {
      toValue: 1,
      duration: LOGO_FADE_IN_MS,
      useNativeDriver: true,
    }).start();

    const moveTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: TRANSITION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: headerScale,
          duration: TRANSITION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }, SPLASH_HOLD_MS);

    const uiTimer = setTimeout(() => {
      Animated.timing(loginUiOpacity, {
        toValue: 1,
        duration: LOGIN_UI_FADE_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, SPLASH_HOLD_MS + TRANSITION_MS);

    return () => {
      clearTimeout(moveTimer);
      clearTimeout(uiTimer);
    };
  }, [translateY, logoScale, headerScale, logoFade, loginUiOpacity]);

  async function signInWithApple() {
    try {
      setLoading(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) throw error;
      setCurrentProvider('apple');
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign In Error', e.message ?? 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      setLoading(true);

      const isExpoGo = Constants.appOwnership === 'expo';
      const redirectTo = isExpoGo
        ? makeRedirectUri({ path: 'auth/callback' })
        : 'slickfinance://auth/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      if (!data.url) throw new Error('No auth URL returned');

      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectTo,
      );

      if (result.type === 'success') {
        const { url } = result;
        const hashPart = url.split('#')[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const access_token = params.get('access_token');
          const refresh_token = params.get('refresh_token');

          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (sessionError) throw sessionError;
            setCurrentProvider('google');
          }
        }
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Sign In Error', e.message ?? 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  }

  function onCarouselScrollEnd(
    e: NativeSyntheticEvent<NativeScrollEvent>,
  ) {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    const w = layoutMeasurement.width;
    if (w <= 0) return;
    const page = Math.round(contentOffset.x / w);
    const max = LOGIN_ONBOARDING_SLIDES.length - 1;
    setPagerPage(Math.min(Math.max(0, page), max));
  }

  return (
    <View style={s.root}>
      <View style={s.bgLayer} pointerEvents="none">
        <Image
          source={TAB_SCREEN_BACKGROUND}
          style={{ width: screenWidth, height: bgHeight }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          recyclingKey="login-tab-bg"
        />
      </View>

      <Animated.View
        style={[
          s.logoSlot,
          {
            top: finalTop,
            opacity: logoFade,
            transform: [{ translateY }, { scale: logoScale }],
          },
        ]}
        pointerEvents="none"
      >
        <SvgXml
          xml={SPLASH_LOGO_MARK_XML}
          width={SPLASH_LOGO_WIDTH}
          height={SPLASH_LOGO_HEIGHT}
        />
      </Animated.View>

      <View
        style={[
          s.main,
          {
            paddingTop: contentPaddingTop,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        {loading && (
          <View style={s.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.text} />
          </View>
        )}

        <Animated.View style={[s.loginBlock, { opacity: loginUiOpacity }]}>
          <View style={s.onboardingGroup}>
            {/*
              Horizontal paging via core ScrollView — works in Expo Go.
            */}
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              bounces={false}
              style={s.pager}
              removeClippedSubviews={false}
              onMomentumScrollEnd={onCarouselScrollEnd}
              keyboardShouldPersistTaps="handled"
            >
              {LOGIN_ONBOARDING_SLIDES.map((slide, index) => (
                <View
                  key={index}
                  style={[s.page, { width: slideWidth }]}
                  collapsable={false}
                >
                  <View
                    style={[
                      s.slideInner,
                      {
                        paddingLeft: slidePadLeft,
                        paddingRight: slidePadRight,
                      },
                    ]}
                  >
                    <View
                      style={[
                        s.slideIllustrationSlot,
                        { minHeight: SLIDE_ILLUSTRATION_MIN_HEIGHT },
                      ]}
                      accessibilityLabel="Illustration"
                    />
                    <View style={s.slideTextBlock}>
                      <Text
                        style={[
                          s.slideTitle,
                          slide.title.includes('\n') && s.slideTitleMultiline,
                        ]}
                      >
                        {slide.title}
                      </Text>
                      <Text style={s.slideSubtitle}>{slide.subtitle}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={s.pageControlRow}>
              <IosPageControl
                count={LOGIN_ONBOARDING_SLIDES.length}
                currentIndex={pagerPage}
              />
            </View>
          </View>

          <View style={s.buttonsSection}>
            <View style={s.authButtonsCol}>
              {Platform.OS === 'ios' && (
                <Pressable
                  onPress={signInWithApple}
                  disabled={loading}
                  style={({ pressed }) => [
                    s.btn,
                    s.appleBtn,
                    pressed && s.pressed,
                  ]}
                >
                  <SFIcon name="apple.logo" size={24} color="#FFFFFF" />
                  <Text style={s.appleBtnText}>Continue with Apple</Text>
                </Pressable>
              )}

              <Pressable
                onPress={signInWithGoogle}
                disabled={loading}
                style={({ pressed }) => [
                  s.btn,
                  s.googleBtn,
                  pressed && s.pressed,
                ]}
              >
                <SvgXml
                  xml={GOOGLE_G_COLOR_LOGO_XML}
                  width={24}
                  height={24}
                />
                <Text style={s.googleBtnText}>Continue with Google</Text>
              </Pressable>
            </View>

            <Text style={s.terms}>
              By continuing, you agree to our{'\n'}
              <Text
                style={s.termsLink}
                onPress={() => Linking.openURL(TERMS_URL)}
              >
                Terms of Service
              </Text>
              {' and '}
              <Text
                style={s.termsLink}
                onPress={() => Linking.openURL(PRIVACY_URL)}
              >
                Privacy Policy
              </Text>
            </Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  bgLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  logoSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  main: {
    flex: 1,
  },
  loginBlock: {
    flex: 1,
  },
  onboardingGroup: {
    flex: 1,
    width: '100%',
    alignSelf: 'stretch',
  },
  pager: {
    flex: 1,
    alignSelf: 'stretch',
  },
  page: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  slideInner: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  slideIllustrationSlot: {
    width: '100%',
    alignSelf: 'stretch',
    borderRadius: 16,
    marginBottom: 16,
  },
  slideTextBlock: {
    flexGrow: 0,
  },
  slideTitle: {
    fontFamily: BRICOLAGE_GROTESQUE_EXTRA_BOLD,
    fontSize: 34,
    color: '#000000',
    lineHeight: 34,
    letterSpacing: -1.02,
    textAlign: 'center',
    marginBottom: 16,
  },
  /** Two-line H1 — two × 34px line height. */
  slideTitleMultiline: {
    minHeight: 68,
  },
  slideSubtitle: {
    fontFamily: 'SF Pro Display',
    fontSize: 17,
    fontWeight: '500',
    lineHeight: 26,
    color: colors.textMuted,
    textAlign: 'center',
    minHeight: 52,
  },
  /** iOS `UIPageControl` height per HIG — tight gap under subtitle. */
  pageControlRow: {
    marginTop: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(245,245,245,0.72)',
    zIndex: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonsSection: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  authButtonsCol: {
    gap: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 60,
    borderRadius: 999,
  },
  pressed: { opacity: 0.8 },
  appleBtn: {
    backgroundColor: '#000000',
  },
  appleBtnText: {
    fontFamily: 'SF Pro Display',
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
  },
  googleBtnText: {
    fontFamily: 'SF Pro Display',
    fontSize: 17,
    fontWeight: '600',
    color: '#0B0803',
  },
  terms: {
    ...sheetTypography.optionMuted,
    textAlign: 'center',
    marginTop: 24,
    lineHeight: 18,
  },
  termsLink: {
    ...sheetTypography.optionMuted,
    textDecorationLine: 'underline',
    color: colors.text,
  },
});
