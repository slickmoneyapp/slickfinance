# Native Navigation Implementation Guide

> **Audience:** LLM / AI coding assistant.
> **Goal:** Replace an existing React Navigation setup in an Expo (SDK 54+) project with fully native iOS navigation (UIKit navigation bar, native tab bar, large collapsing titles, SF Symbol toolbar buttons) **without changing screen content components**.

---

## 1. Prerequisites / Assumptions

- Expo SDK 54+ managed workflow (with `npx expo prebuild` / `npx expo run:ios`).
- React Native 0.81+.
- New Architecture enabled (`"newArchEnabled": true` in `app.json`).
- The project already has screen components that render content. **Do not modify those.**
- The project may already use `@react-navigation/native` and a JS-based stack/tabs. This guide replaces the **navigation layer only**.

---

## 2. Design Tokens (exact values)

Every visual property in one place. An LLM implementing this must use these exact values unless the target project specifies overrides.

### Typography

| Element | Font family | Weight | Size | Color | Letter-spacing (kern) |
|---|---|---|---|---|---|
| Large title (expanded) | Bricolage Grotesque 800 ExtraBold | 800 | 34pt | `#000` | −2pt (native patch) |
| Inline title (collapsed) | System default (bold) | 600 | System default | `#000` | 0 (none) |

### Header bar

| Property | Value |
|---|---|
| Background | Fully transparent (`backgroundColor: 'transparent'`) |
| Shadow / separator | Hidden (`headerShadowVisible: false`, `headerLargeTitleShadowVisible: false`) |
| Blur effect (iOS < 26, on scroll) | `systemChromeMaterial` |
| Scroll-edge effect (iOS 26+) | `top: 'hidden'` (prevents new scroll-edge animation blocking collapse) |
| Back button tint | `#007AFF` (`headerTintColor`) |
| Title horizontal inset | ~36pt total (19pt paragraph indent + ~17pt system margin, via native patch) |

### Toolbar button (header right)

| Property | iOS | Android |
|---|---|---|
| Icon | SF Symbol `plus.circle.fill` (native `UIBarButtonItem`) | Ionicons `add-circle` (28px React component) |
| Color | `#000` | `#000` |
| Present on | All tab root screens | All tab root screens |

### Tab bar (native `UITabBarController`)

| Property | Value |
|---|---|
| Active tint | `#CB30E0` |
| Inactive tint | `#8C8C8C` |
| Tab icons (iOS) | SF Symbols: `creditcard`, `chart.pie`, `chart.line.uptrend.xyaxis`, `person.circle` |
| Tab icons (Android) | Fallback to a `require()`'d PNG image asset |

### Status bar

| Property | Value |
|---|---|
| Style | `dark` (dark text on light background) |

### Screen content

| Property | Value |
|---|---|
| Scroll background | `#fff` |
| Content inset behavior (iOS) | `automatic` (system adjusts for transparent nav bar) |
| Bounce | `alwaysBounceVertical: true`, `bounces: true` |
| Min scroll height (iOS) | `windowHeight + 1` (ensures scrollable so large title can collapse) |
| Home indicator | Visible (`autoHideHomeIndicator: false`) |
| Bottom safe area | Respected (via native bottom-tabs patch) |

---

## 3. Install Dependencies

Run from the project root:

```bash
npx expo install \
  @react-navigation/native \
  @react-navigation/native-stack \
  react-native-screens \
  react-native-safe-area-context \
  react-native-gesture-handler \
  react-native-bottom-tabs \
  @bottom-tabs/react-navigation \
  @expo/vector-icons \
  expo-font \
  expo-splash-screen \
  @expo-google-fonts/bricolage-grotesque

npm install --save-dev patch-package
```

### 2a. Add `postinstall` script

In `package.json`, ensure:

```json
"scripts": {
  "postinstall": "patch-package"
}
```

### 2b. Register Expo plugins

In `app.json` (or `app.config.js`), add to the `"plugins"` array:

```json
"plugins": [
  "react-native-bottom-tabs",
  "expo-font"
]
```

These config plugins configure the native projects during prebuild. They are **required** for the native tab bar and font loading to work.

---

## 4. Patch: `react-native-screens` (native header customization)

Create `patches/react-native-screens+4.24.0.patch` (adjust version to match your installed version).

This patch modifies `RNSScreenStackHeaderConfig.mm` in the `buildAppearance:withConfig:` method to add:

1. **Horizontal paragraph insets** on both standard and large title text attributes (`NSParagraphStyle`) — ~19pt `firstLineHeadIndent` / `headIndent` and −19pt `tailIndent`. This stacks with UINavigationBar's built-in ~17pt content margin to produce ~36pt total horizontal inset.
2. **Letter-spacing (kern) on large title only** — `NSKernAttributeName = -2.0` applied to `largeTitleTextAttributes` only (not inline title).

### Exact patch content:

```diff
diff --git a/node_modules/react-native-screens/ios/RNSScreenStackHeaderConfig.mm b/node_modules/react-native-screens/ios/RNSScreenStackHeaderConfig.mm
index 7d8e494..8948521 100644
--- a/node_modules/react-native-screens/ios/RNSScreenStackHeaderConfig.mm
+++ b/node_modules/react-native-screens/ios/RNSScreenStackHeaderConfig.mm
@@ -439,6 +439,12 @@ + (UINavigationBarAppearance *)buildAppearance:(UIViewController *)vc withConfig
 {
   UINavigationBarAppearance *appearance = [UINavigationBarAppearance new];
 
+  // Paragraph indents stack with UINavigationBar's default content margins (~16–17pt). Using 36pt here
+  // measured ~53pt to the glyph on iPhone; 19 ≈ 36 total (36 − 17).
+  const CGFloat rnscreens_titleHorizontalParagraphInset = 19.0;
+  // Large title only — letter-spacing ≈ CSS -2px (kern is in points).
+  const CGFloat rnscreens_largeTitleKern = -2.0;
+
   if (config.backgroundColor && CGColorGetAlpha(config.backgroundColor.CGColor) == 0.) {
     // Preserve the shadow properties in case the user wants to show the shadow on scroll.
     UIColor *shadowColor = appearance.shadowColor;
@@ -501,6 +507,14 @@ + (UINavigationBarAppearance *)buildAppearance:(UIViewController *)vc withConfig
     } else {
       attrs[NSFontAttributeName] = [UIFont boldSystemFontOfSize:[size floatValue]];
     }
+
+    // Target ~36pt total horizontal inset to title (see rnscreens_titleHorizontalParagraphInset).
+    NSMutableParagraphStyle *titleParagraph = [[NSMutableParagraphStyle alloc] init];
+    titleParagraph.firstLineHeadIndent = rnscreens_titleHorizontalParagraphInset;
+    titleParagraph.headIndent = rnscreens_titleHorizontalParagraphInset;
+    titleParagraph.tailIndent = -rnscreens_titleHorizontalParagraphInset;
+    attrs[NSParagraphStyleAttributeName] = titleParagraph;
+
     appearance.titleTextAttributes = attrs;
   }
 
@@ -530,6 +544,14 @@ + (UINavigationBarAppearance *)buildAppearance:(UIViewController *)vc withConfig
       largeAttrs[NSFontAttributeName] = [UIFont systemFontOfSize:[largeSize floatValue] weight:UIFontWeightBold];
     }
 
+    // Same as standard title — ~36pt total to glyph with bar's built-in margin.
+    NSMutableParagraphStyle *largeTitleParagraph = [[NSMutableParagraphStyle alloc] init];
+    largeTitleParagraph.firstLineHeadIndent = rnscreens_titleHorizontalParagraphInset;
+    largeTitleParagraph.headIndent = rnscreens_titleHorizontalParagraphInset;
+    largeTitleParagraph.tailIndent = -rnscreens_titleHorizontalParagraphInset;
+    largeAttrs[NSParagraphStyleAttributeName] = largeTitleParagraph;
+    largeAttrs[NSKernAttributeName] = @(rnscreens_largeTitleKern);
+
     appearance.largeTitleTextAttributes = largeAttrs;
   }
 
```

### Tuning

- `rnscreens_titleHorizontalParagraphInset`: Change from `19.0` to adjust total horizontal inset (adds to system's ~17pt margin).
- `rnscreens_largeTitleKern`: Change from `-2.0` to adjust letter-spacing on the large title only.

---

## 5. Patch: `react-native-bottom-tabs` (home indicator / safe area)

Create `patches/react-native-bottom-tabs+1.1.0.patch` (adjust version).

By default the native tab view ignores **all** safe area edges, which zeros out the bottom (home indicator) inset for React Native content. This patch changes `.all` to `[.top, .leading, .trailing]` so the bottom safe area reaches JS.

### Exact patch content:

```diff
diff --git a/node_modules/react-native-bottom-tabs/ios/TabView/LegacyTabView.swift b/node_modules/react-native-bottom-tabs/ios/TabView/LegacyTabView.swift
index 9d0a624..cb6fa42 100644
--- a/node_modules/react-native-bottom-tabs/ios/TabView/LegacyTabView.swift
+++ b/node_modules/react-native-bottom-tabs/ios/TabView/LegacyTabView.swift
@@ -39,7 +39,7 @@ struct LegacyTabView: AnyTabView {
         )
 
         RepresentableView(view: child)
-          .ignoresSafeArea(.container, edges: .all)
+          .ignoresSafeArea(.container, edges: [.top, .leading, .trailing])
           .tabItem {
             TabItem(
               title: tabData.title,
diff --git a/node_modules/react-native-bottom-tabs/ios/TabView/NewTabView.swift b/node_modules/react-native-bottom-tabs/ios/TabView/NewTabView.swift
index d699315..a1ed602 100644
--- a/node_modules/react-native-bottom-tabs/ios/TabView/NewTabView.swift
+++ b/node_modules/react-native-bottom-tabs/ios/TabView/NewTabView.swift
@@ -30,7 +30,8 @@ struct NewTabView: AnyTabView {
 
             Tab(value: tabData.key, role: tabData.role?.convert()) {
               RepresentableView(view: child.view)
-                .ignoresSafeArea(.container, edges: .all)
+                // Respect bottom safe area (home indicator). Ignoring .all zeros out JS insets.
+                .ignoresSafeArea(.container, edges: [.top, .leading, .trailing])
                 .tabAppear(using: context)
                 .hideTabBar(props.tabBarHidden)
             } label: {
```

---

## 6. Apply patches

After creating both patch files in `patches/`, run:

```bash
npx patch-package react-native-screens
npx patch-package react-native-bottom-tabs
```

Or if you placed the files manually, just run `npm install` (the `postinstall` script applies them).

---

## 7. Font constants file

Create a file (e.g. `src/constants/fonts.ts`):

```typescript
export const BRICOLAGE_GROTESQUE_EXTRA_BOLD = 'BricolageGrotesque_800ExtraBold';

export const stackHeaderLargeTitleStyle = {
  fontFamily: BRICOLAGE_GROTESQUE_EXTRA_BOLD,
  fontSize: 34,
  fontWeight: '800' as const,
  color: '#000',
};
```

Only `fontFamily`, `fontSize`, `fontWeight`, and `color` are forwarded from JS to UIKit for native stack headers. Everything else (paragraph inset, kern) is handled by the native patch.

---

## 8. App entry point (`App.tsx`)

Wrap the app in `SafeAreaProvider`, load fonts with `useFonts`, and hold the splash screen until ready:

```tsx
import {
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/bricolage-grotesque';
import { NavigationContainer } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import {
  SafeAreaProvider,
  initialWindowMetrics,
} from 'react-native-safe-area-context';
import RootTabs from './src/navigation/RootTabs';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style="dark" />
      <NavigationContainer>
        <RootTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

**Key points:**
- If the existing project already has `NavigationContainer` and `SafeAreaProvider`, keep them — just make sure `initialMetrics={initialWindowMetrics}` is set on `SafeAreaProvider`.
- The font loading with splash screen is optional but recommended to prevent a flash of unstyled title.

---

## 9. Navigation structure (`RootTabs.tsx`)

The architecture is: **Native Bottom Tabs → each tab contains a Native Stack Navigator → each stack has screen(s)**.

```
Tab.Navigator (native UITabBarController)
  ├── Tab "Subscriptions" → SubscriptionsStack.Navigator (native UINavigationController)
  │     └── Screen "Subscriptions" → <YourExistingScreenComponent />
  ├── Tab "Budget" → BudgetStack.Navigator
  │     └── Screen "Budget" → <YourExistingScreenComponent />
  └── ... more tabs
```

### 9a. Stack screen options (shared across all stacks)

```typescript
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { Platform } from 'react-native';
import { stackHeaderLargeTitleStyle } from '../constants/fonts';

const iosMajor = Platform.OS === 'ios'
  ? parseInt(String(Platform.Version), 10)
  : 0;

const stackScreenOptions: NativeStackNavigationOptions = {
  autoHideHomeIndicator: false,
  headerLargeTitle: true,
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerStyle: { backgroundColor: 'transparent' },
  headerLargeStyle: { backgroundColor: 'transparent' },
  headerTintColor: '#007AFF',
  headerLargeTitleStyle: stackHeaderLargeTitleStyle,
  headerTitleStyle: {
    fontWeight: '600',
    color: '#000',
  },
  // iOS 26+ changes scroll-edge behavior; older iOS uses blur.
  ...(iosMajor >= 26
    ? {
        scrollEdgeEffects: {
          top: 'hidden',
          bottom: 'automatic',
          left: 'automatic',
          right: 'automatic',
        },
      }
    : iosMajor > 0
      ? { headerBlurEffect: 'systemChromeMaterial' as const }
      : {}),
};
```

**What each option does:**
| Option | Purpose |
|---|---|
| `autoHideHomeIndicator: false` | Keep the home-indicator pill visible at all times |
| `headerLargeTitle: true` | UIKit large title that collapses to inline on scroll |
| `headerTransparent: true` | Content scrolls behind the bar (required for collapse) |
| `headerShadowVisible / headerLargeTitleShadowVisible: false` | No hairline separator |
| `headerStyle/headerLargeStyle: transparent` | No opaque bar background |
| `headerBlurEffect` (< iOS 26) | Translucent blur when title collapses |
| `scrollEdgeEffects` (iOS 26+) | Disable new scroll-edge animation that blocks collapse |

### 9b. SF Symbol toolbar button (+ icon in header right)

```typescript
import type { NativeStackHeaderItem } from '@react-navigation/native-stack';
import { HeaderButton } from '@react-navigation/elements';
import Ionicons from '@expo/vector-icons/Ionicons';

const plusToolbarOptions: NativeStackNavigationOptions =
  Platform.OS === 'ios'
    ? {
        unstable_headerRightItems: (): NativeStackHeaderItem[] => [
          {
            type: 'button',
            label: '',
            icon: { type: 'sfSymbol', name: 'plus.circle.fill' },
            tintColor: '#000',
            onPress: () => {
              // Wire navigation / modal actions here
            },
            accessibilityLabel: 'Add',
          },
        ],
      }
    : {
        headerRight: () => (
          <HeaderButton
            accessibilityLabel="Add"
            onPress={() => {
              // Wire navigation / modal actions here
            }}
          >
            <Ionicons name="add-circle" size={28} color="#000" />
          </HeaderButton>
        ),
      };

const stackScreenOptionsWithPlus: NativeStackNavigationOptions = {
  ...stackScreenOptions,
  ...plusToolbarOptions,
};
```

- On **iOS**: `unstable_headerRightItems` renders a **native UIBarButtonItem** with an SF Symbol — no React component in the bar.
- On **Android**: Falls back to `headerRight` with an Ionicons icon.
- To use different SF Symbols per tab, override `unstable_headerRightItems` in individual screen `options`.
- To remove the + button from a specific tab, use `stackScreenOptions` (without plus) for that stack.

### 9c. Tab navigator with native bottom tabs

```typescript
import { createNativeBottomTabNavigator } from '@bottom-tabs/react-navigation';

const Tab = createNativeBottomTabNavigator();

function tabBarIconSfSymbol(sfSymbol: string) {
  return () =>
    Platform.OS === 'ios'
      ? { sfSymbol }
      : require('../../assets/icon.png'); // Android fallback
}

export default function RootTabs() {
  return (
    <Tab.Navigator
      tabBarActiveTintColor="#CB30E0"
      tabBarInactiveTintColor="#8C8C8C"
    >
      <Tab.Screen
        name="TabOneName"
        component={TabOneStackNavigator}
        options={{
          tabBarIcon: tabBarIconSfSymbol('creditcard'),
        }}
      />
      {/* ... more tabs */}
    </Tab.Navigator>
  );
}
```

**Tab icon notes:**
- On iOS, `tabBarIcon` returns `{ sfSymbol: 'symbol.name' }` for native SF Symbols.
- On Android, return a `require()`'d image asset.
- Find SF Symbol names at [developer.apple.com/sf-symbols](https://developer.apple.com/sf-symbols/).

### 9d. Each tab's stack navigator

For each tab, create a stack navigator wrapping the **existing screen component**:

```typescript
const TabOneStack = createNativeStackNavigator();

function TabOneStackNavigator() {
  return (
    <TabOneStack.Navigator screenOptions={stackScreenOptionsWithPlus}>
      <TabOneStack.Screen
        name="ScreenName"
        component={YourExistingScreenComponent}  // DO NOT MODIFY
        options={{ title: 'Screen Title' }}
      />
    </TabOneStack.Navigator>
  );
}
```

**Repeat** for every tab. The screen components are passed through unchanged.

---

## 10. Screen content requirements (for large title collapse to work)

The large title **only collapses** when the screen contains a scroll view whose scroll offset changes. The top-level content of each screen must be a `ScrollView` (or `FlatList` / `SectionList`) with:

```tsx
<ScrollView
  contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
  alwaysBounceVertical
  bounces
>
  {/* Screen content — minHeight should slightly exceed window height */}
</ScrollView>
```

- `contentInsetAdjustmentBehavior="automatic"` tells iOS to offset content below the transparent navigation bar.
- `alwaysBounceVertical` + content taller than the viewport ensures the scroll view actually scrolls, triggering the large→inline title transition.
- If a screen has **no scrollable content**, the large title will stay expanded (it won't collapse).

You can wrap existing screens in a utility component like:

```tsx
export function NativeScrollWrapper({ children }: { children: ReactNode }) {
  const { height } = useWindowDimensions();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{
        flexGrow: 1,
        minHeight: Platform.OS === 'ios' ? height + 1 : height,
      }}
      contentInsetAdjustmentBehavior={Platform.OS === 'ios' ? 'automatic' : undefined}
      alwaysBounceVertical
      bounces
    >
      {children}
    </ScrollView>
  );
}
```

**Important:** `minHeight: height + 1` on iOS — the +1 ensures a tiny bit of scrollable overflow so UIKit detects scroll and collapses the title.

---

## 11. Migration checklist

When replacing existing navigation in a project:

1. [ ] Install all dependencies from Section 3.
2. [ ] Add `"postinstall": "patch-package"` to `package.json` scripts.
3. [ ] Add `"react-native-bottom-tabs"` and `"expo-font"` to `app.json` plugins array.
4. [ ] Create both patch files in `patches/` directory (Sections 4 and 5).
5. [ ] Run `npm install` to apply patches.
6. [ ] Create `src/constants/fonts.ts` with large title font style.
7. [ ] Update `App.tsx`: add `SafeAreaProvider`, `useFonts`, splash screen logic (Section 8).
8. [ ] Replace existing tab/stack navigators with native equivalents (Section 9).
9. [ ] **Do not modify screen components.** Only change how they're referenced in navigation.
10. [ ] Ensure each screen's top-level view is a `ScrollView` with `contentInsetAdjustmentBehavior="automatic"` (Section 10).
11. [ ] Run `npx expo run:ios --device` (native rebuild required — Expo Go won't work with native patches).

---

## 12. Common pitfalls

| Problem | Cause | Fix |
|---|---|---|
| Large title never collapses | Screen content doesn't scroll | Wrap in `ScrollView` with `minHeight: windowHeight + 1` |
| Large title doesn't collapse on iOS 26 | `scrollEdgeEffects` default behavior | Set `scrollEdgeEffects: { top: 'hidden' }` |
| Home indicator area has no padding | `react-native-bottom-tabs` ignores all safe area edges | Apply the bottom-tabs patch (Section 5) |
| Title horizontal inset too large/small | Paragraph indent is additive with system bar margin | Adjust `rnscreens_titleHorizontalParagraphInset` in the screens patch |
| Build fails on paths with spaces | Xcode shell script doesn't quote the path | Quote `$REACT_NATIVE_XCODE` in `project.pbxproj` bundle script |
| Font doesn't appear on title | `useFonts` hasn't resolved or font key doesn't match | Ensure splash screen blocks render until fonts load; `fontFamily` must match the key passed to `useFonts` |
| SF Symbol doesn't show in tab bar | Using JS tab navigator instead of native | Must use `@bottom-tabs/react-navigation` (`createNativeBottomTabNavigator`) |
| `unstable_headerRightItems` ignored | Android doesn't support it | Use `headerRight` with React component on Android |

---

## 13. Customization reference

### Change the large title font
Edit `src/constants/fonts.ts` — change `fontFamily` and install the corresponding `@expo-google-fonts/*` package. Update `useFonts()` in `App.tsx`.

### Change letter-spacing on large title
Edit `rnscreens_largeTitleKern` in the `react-native-screens` patch. Negative = tighter, positive = looser. Re-run `npx patch-package react-native-screens`.

### Change horizontal title inset
Edit `rnscreens_titleHorizontalParagraphInset` in the patch. The total inset = this value + ~17pt system margin. Re-run `npx patch-package react-native-screens`.

### Change the + button SF Symbol
In `unstable_headerRightItems`, change `name: 'plus.circle.fill'` to any SF Symbol name.

### Change tab bar colors
`tabBarActiveTintColor` / `tabBarInactiveTintColor` on `Tab.Navigator`.

### Remove + button from specific tab
Use `stackScreenOptions` (without plus) as `screenOptions` for that tab's stack navigator.

---

## 14. Version matrix (tested)

| Package | Version |
|---|---|
| expo | ~54.0.33 |
| react-native | 0.81.5 |
| react-native-screens | ^4.24.0 |
| react-native-bottom-tabs | ^1.1.0 |
| @bottom-tabs/react-navigation | ^1.1.0 |
| @react-navigation/native | ^7.2.2 |
| @react-navigation/native-stack | ^7.14.10 |
| react-native-safe-area-context | ^5.7.0 |
| react-native-gesture-handler | ~2.28.0 |
| expo-font | ~14.0.11 |
| expo-splash-screen | ~31.0.13 |
| patch-package | ^8.0.1 |
