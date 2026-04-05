# Add Subscription FormSheet Flow — Complete Implementation Reference

> **This is an LLM prompt.** Copy this entire file and give it to an AI assistant along with your existing project. It contains every file, every line, every design token, and every critical constraint needed to implement a native iOS formSheet modal flow with a company picker and subscription details screen in an Expo + React Native project using `@react-navigation/native-stack`.

---

## CRITICAL: What makes or breaks this

This flow is a **native iOS formSheet** (`UIModalPresentationFormSheet`) presented from a `createNativeStackNavigator`. Inside it, two logical screens (company picker and subscription details) are managed with **React state**, not a nested navigator.

**You CANNOT nest a `createNativeStackNavigator` inside another native stack's `formSheet` route.** The inner navigator renders a blank white screen. This is a confirmed limitation of `react-native-screens` (tested with v4.24.0). The workaround is a single component that uses `useLayoutEffect` + `parentNav.setOptions()` to dynamically update the native header as the user moves between picker and details views.

**Other critical rules:**

1. The flow component's root must be a `ScrollView` — NOT wrapped in a `<View>`. UIKit needs the `ScrollView` as the direct root to connect `contentInsetAdjustmentBehavior` and `headerSearchBarOptions` to the native navigation controller.

2. `contentInsetAdjustmentBehavior="automatic"` must be set on every `ScrollView` in the flow. Without it, content overlaps the transparent header or starts at the wrong offset.

3. `headerSearchBarOptions` must be set via `useLayoutEffect` + `navigation.setOptions()` from within the component — NOT as static screen options on the route registration. Setting it statically on a formSheet route causes the list content to disappear.

4. When switching from picker to details view, set `headerSearchBarOptions: undefined` to remove the search bar. Setting it back when returning to picker view re-enables it.

5. On iOS, use `unstable_headerLeftItems` and `unstable_headerRightItems` for native `UIBarButtonItem` rendering with SF Symbols. These create real native bar buttons, not React components in the header. On Android, fall back to `headerLeft`/`headerRight` with React components.

6. The formSheet route in the outer stack must use `component={FlowNavigator}` with a direct component reference. **Do NOT use a children render function / render prop** — it causes the formSheet to render blank.

---

## ARCHITECTURE OVERVIEW

```
SubscriptionsStack (createNativeStackNavigator)
  ├── "Subscriptions" (normal screen, AppScreen wrapper)
  │     options: headerLargeTitle: true, + button navigates to AddSubscriptionFlow
  │
  └── "AddSubscriptionFlow" (presentation: 'formSheet', headerShown: true)
        component: AddSubscriptionFlowNavigator
        │
        └── Single component manages two views via React state:
              ├── state: { screen: 'picker' }
              │     → renders PickerBody (ScrollView with company list)
              │     → setOptions: title "Add Subscription", headerLargeTitle: true,
              │       headerSearchBarOptions, xmark close button (left)
              │
              └── state: { screen: 'details', companyName: string }
                    → renders DetailsBody (ScrollView with info card)
                    → setOptions: title "Details", headerLargeTitle: false,
                      chevron.backward back button (left), Save button (right)
```

**Key insight:** There is no inner `Stack.Navigator`. The two "screens" are just conditional renders inside one component. The native header is updated dynamically via `parentNav.setOptions()` in a `useLayoutEffect` that depends on the current flow state.

---

## DEPENDENCIES

This flow requires the same dependencies as the native header implementation:

```bash
npx expo install \
  @react-navigation/native \
  @react-navigation/native-stack \
  react-native-screens \
  react-native-safe-area-context \
  react-native-gesture-handler \
  @expo/vector-icons
```

No additional dependencies beyond what the native navigation setup already uses.

---

## FILE STRUCTURE

```
src/
  navigation/
    types.ts                    ← SubscriptionsStackParamList includes AddSubscriptionFlow
    RootTabs.tsx                ← Outer stack registers AddSubscriptionFlow as formSheet
    AddSubscriptionStack.tsx    ← Flow component: picker + details + styles
  constants/
    subscriptionCompanies.ts   ← Predefined company list
```

---

## STEP 1: TYPES — `src/navigation/types.ts`

The outer stack's param list needs one route for the flow. No params — the flow manages its own state internally.

```typescript
export type SubscriptionsStackParamList = {
  Subscriptions: undefined;
  AddSubscriptionFlow: undefined;
};
```

The flow also exports its own param list type for internal use (referenced by the flow component for type-safe state):

```typescript
// In AddSubscriptionStack.tsx
export type AddSubscriptionFlowParamList = {
  CompanyPicker: undefined;
  Details: { companyName: string };
};
```

This type is NOT used by any navigator — it exists only for documentation and potential future use.

---

## STEP 2: COMPANY LIST — `src/constants/subscriptionCompanies.ts`

```typescript
export const SUBSCRIPTION_COMPANIES = [
  'Netflix',
  'Spotify',
  'YouTube Premium',
  'Apple Music',
  'Apple TV+',
  'iCloud+',
  'Disney+',
  'Hulu',
  'Max',
  'Paramount+',
  'Peacock',
  'Prime Video',
  'Audible',
  'ChatGPT Plus',
  'Adobe Creative Cloud',
  'Notion',
  'Figma',
  'Dropbox',
  'Google One',
  'Canva Pro',
  'Microsoft 365 Personal',
] as const;
```

---

## STEP 3: OUTER ROUTE REGISTRATION — `src/navigation/RootTabs.tsx`

The formSheet route is registered in the existing `SubscriptionsStack`. Only the relevant portion is shown:

```tsx
import { AddSubscriptionFlowNavigator } from './AddSubscriptionStack';

// Inside SubscriptionsStackNavigator():
<SubscriptionsStack.Screen
  name="Subscriptions"
  component={SubscriptionsScreen}
  options={({ navigation }) => ({
    title: 'Subscriptions',
    ...buildPlusToolbarOptions(() => {
      navigation.navigate('AddSubscriptionFlow');
    }),
  })}
/>
<SubscriptionsStack.Screen
  name="AddSubscriptionFlow"
  component={AddSubscriptionFlowNavigator}
  options={{
    headerShown: true,
    presentation: Platform.OS === 'ios' ? 'formSheet' : 'modal',
    headerLargeTitle: true,
    headerTransparent: true,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: 'transparent' },
    ...(iosMajor >= 26
      ? {}
      : iosMajor > 0
        ? { headerBlurEffect: 'systemChromeMaterial' as const }
        : {}),
    title: 'Add Subscription',
  }}
/>
```

**Every option explained:**

| Option | Value | Why |
|---|---|---|
| `headerShown` | `true` | The flow component updates the header dynamically. If `false`, there's no header to update. |
| `presentation` | `'formSheet'` (iOS) / `'modal'` (Android) | Creates the native iOS form sheet card that slides up. |
| `headerLargeTitle` | `true` | Initial large title for "Add Subscription". The flow component overrides this per-view. |
| `headerTransparent` | `true` | Content scrolls behind the header with blur effect. |
| `headerShadowVisible` | `false` | No hairline separator under the header. |
| `headerBlurEffect` | `'systemChromeMaterial'` (iOS < 26) | Translucent blur when content scrolls under the header. |
| `title` | `'Add Subscription'` | Initial title, overridden by the flow component immediately. |

**CRITICAL:** Use `component={AddSubscriptionFlowNavigator}` — a direct component reference. Do NOT use a render-prop / children function like `{({ navigation }) => <Component />}`. The render-prop pattern causes the formSheet to mount as a blank white screen.

---

## STEP 4: FLOW COMPONENT — `src/navigation/AddSubscriptionStack.tsx`

This is the complete file. It contains the flow navigator component, picker body, details body, and all styles.

```tsx
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackHeaderItem, NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SUBSCRIPTION_COMPANIES } from '../constants/subscriptionCompanies';
import type { SubscriptionsStackParamList } from './types';

export type AddSubscriptionFlowParamList = {
  CompanyPicker: undefined;
  Details: { companyName: string };
};

type FlowState =
  | { screen: 'picker' }
  | { screen: 'details'; companyName: string };

const INSET_H = 16;
const GROUP_RADIUS = 10;
const ROW_ICON = 29;
const SEP_INSET_LEFT = INSET_H + ROW_ICON + 12; // 57 — text-edge aligned
const IOS_CARD_BG = '#FFFFFF';
const IOS_SEPARATOR = 'rgba(60, 60, 67, 0.24)';
const IOS_PRIMARY_LABEL = '#111111';
const IOS_SECONDARY_LABEL = 'rgba(60, 60, 67, 0.62)';
const IOS_ROW_HIGHLIGHT = 'rgba(120, 120, 128, 0.12)';

export function AddSubscriptionFlowNavigator() {
  const parentNav =
    useNavigation<NativeStackNavigationProp<SubscriptionsStackParamList>>();

  const [flow, setFlow] = useState<FlowState>({ screen: 'picker' });
  const [searchText, setSearchText] = useState('');

  const dismiss = useCallback(() => parentNav.goBack(), [parentNav]);

  useLayoutEffect(() => {
    if (flow.screen === 'picker') {
      parentNav.setOptions({
        title: 'Add Subscription',
        headerLargeTitle: true,
        headerSearchBarOptions: {
          placeholder: 'Search companies',
          onChangeText: (e: { nativeEvent: { text: string } }) => {
            setSearchText(e.nativeEvent.text ?? '');
          },
        },
        headerLeft: () => null,
        headerRight: () => null,
        ...(Platform.OS === 'ios'
          ? {
              unstable_headerLeftItems: (): NativeStackHeaderItem[] => [
                {
                  type: 'button',
                  label: '',
                  icon: { type: 'sfSymbol', name: 'xmark' },
                  tintColor: '#8E8E93',
                  onPress: dismiss,
                  accessibilityLabel: 'Close',
                },
              ],
            }
          : {
              headerLeft: () => (
                <Pressable onPress={dismiss} accessibilityLabel="Close" hitSlop={8}>
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </Pressable>
              ),
            }),
      });
    } else {
      const goBackToPicker = () => setFlow({ screen: 'picker' });
      parentNav.setOptions({
        title: 'Details',
        headerLargeTitle: false,
        headerSearchBarOptions: undefined,
        ...(Platform.OS === 'ios'
          ? {
              unstable_headerLeftItems: (): NativeStackHeaderItem[] => [
                {
                  type: 'button',
                  label: 'Back',
                  icon: { type: 'sfSymbol', name: 'chevron.backward' },
                  tintColor: '#8E8E93',
                  onPress: goBackToPicker,
                  accessibilityLabel: 'Back',
                },
              ],
              unstable_headerRightItems: (): NativeStackHeaderItem[] => [
                {
                  type: 'button',
                  label: 'Save',
                  variant: 'prominent',
                  tintColor: '#CB30E0',
                  onPress: dismiss,
                  accessibilityLabel: 'Save',
                },
              ],
            }
          : {
              headerLeft: () => (
                <Pressable onPress={goBackToPicker} accessibilityLabel="Back" hitSlop={8}>
                  <Ionicons name="chevron-back" size={24} color="#8E8E93" />
                </Pressable>
              ),
              headerRight: () => (
                <Pressable onPress={dismiss} accessibilityRole="button" style={s.saveButton}>
                  <Text style={s.saveLabel}>Save</Text>
                </Pressable>
              ),
            }),
      });
    }
  }, [flow.screen, parentNav, dismiss]);

  if (flow.screen === 'details') {
    return <DetailsBody companyName={flow.companyName} />;
  }

  return (
    <PickerBody
      searchText={searchText}
      onSelectCompany={(name) => setFlow({ screen: 'details', companyName: name })}
    />
  );
}
```

### Picker Body

```tsx
function PickerBody({
  searchText,
  onSelectCompany,
}: {
  searchText: string;
  onSelectCompany: (name: string) => void;
}) {
  const filteredCompanies = useMemo(() => {
    const query = searchText.trim().toLowerCase();
    if (!query) return [...SUBSCRIPTION_COMPANIES];
    return [...SUBSCRIPTION_COMPANIES].filter((c) => c.toLowerCase().includes(query));
  }, [searchText]);

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.pickerContent}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      {filteredCompanies.length === 0 ? (
        <View style={s.emptyState}>
          <Text style={s.emptyText}>No companies found.</Text>
        </View>
      ) : (
        <>
          <Text style={s.sectionHeader}>POPULAR SERVICES</Text>
          <View style={s.insetGroup}>
            {filteredCompanies.map((item, index) => (
              <View key={item}>
                <Pressable
                  style={({ pressed }) => [s.tableRow, pressed && s.rowPressed]}
                  onPress={() => onSelectCompany(item)}
                >
                  <View style={s.rowIconCircle}>
                    <Text style={s.rowIconLetter}>{item.charAt(0)}</Text>
                  </View>
                  <View style={s.cellTextCol}>
                    <Text style={s.cellTitle} numberOfLines={1}>{item}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color="#C7C7CC" />
                </Pressable>
                {index < filteredCompanies.length - 1 && <Hairline />}
              </View>
            ))}
          </View>
        </>
      )}

      <View style={s.sectionGap} />
      <View style={s.insetGroup}>
        <Pressable
          style={({ pressed }) => [s.tableRow, s.tableRowSingleLine, pressed && s.rowPressed]}
          onPress={() => {}}
        >
          <View style={[s.rowIconCircle, { backgroundColor: '#007AFF' }]}>
            <Ionicons name="add" size={18} color="#fff" />
          </View>
          <View style={s.cellTextCol}>
            <Text style={[s.cellTitle, { color: '#007AFF' }]}>Enter company manually</Text>
          </View>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function Hairline() {
  return <View style={s.hairline} />;
}
```

### Details Body

```tsx
function DetailsBody({ companyName }: { companyName: string }) {
  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.detailsContent}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Text style={s.sectionHeader}>SUBSCRIPTION INFO</Text>
      <View style={s.detailCard}>
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Company</Text>
          <Text style={s.detailValue}>{companyName}</Text>
        </View>
        <View style={s.detailSep} />
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Amount</Text>
          <Text style={s.detailValueMuted}>Not set</Text>
        </View>
        <View style={s.detailSep} />
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Billing</Text>
          <Text style={s.detailValueMuted}>Monthly</Text>
        </View>
        <View style={s.detailSep} />
        <View style={s.detailRow}>
          <Text style={s.detailLabel}>Next payment</Text>
          <Text style={s.detailValueMuted}>Not set</Text>
        </View>
      </View>
    </ScrollView>
  );
}
```

---

## STEP 5: STYLES

All styles are in the same file as the flow component.

```tsx
const s = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },

  // Picker
  pickerContent: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '400',
    color: IOS_SECONDARY_LABEL,
    textTransform: 'uppercase',
    marginHorizontal: INSET_H,
    marginBottom: 6,
    marginTop: 16,
    letterSpacing: 0.2,
  },
  insetGroup: {
    marginHorizontal: INSET_H,
    borderRadius: GROUP_RADIUS,
    overflow: 'hidden',
    backgroundColor: IOS_CARD_BG,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingLeft: INSET_H,
    paddingRight: 12,
    paddingVertical: 10,
  },
  tableRowSingleLine: {
    minHeight: 44,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
  },
  rowPressed: {
    backgroundColor: IOS_ROW_HIGHLIGHT,
  },
  rowIconCircle: {
    width: ROW_ICON,
    height: ROW_ICON,
    borderRadius: ROW_ICON / 2,
    backgroundColor: '#E8E8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconLetter: {
    fontSize: 14,
    fontWeight: '600',
    color: IOS_PRIMARY_LABEL,
  },
  cellTextCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
    minHeight: ROW_ICON,
  },
  cellTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: IOS_PRIMARY_LABEL,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: SEP_INSET_LEFT,
  },
  sectionGap: {
    height: 20,
  },

  // Details
  detailsContent: {
    paddingHorizontal: INSET_H,
    paddingTop: 8,
    paddingBottom: 24,
  },
  detailCard: {
    backgroundColor: IOS_CARD_BG,
    borderRadius: 22,
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  detailSep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: IOS_SEPARATOR,
    marginLeft: 16,
    marginRight: 16,
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: IOS_SECONDARY_LABEL,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: IOS_PRIMARY_LABEL,
  },
  detailValueMuted: {
    fontSize: 15,
    fontWeight: '500',
    color: IOS_SECONDARY_LABEL,
  },

  // Empty
  emptyState: {
    paddingHorizontal: INSET_H,
    paddingVertical: 20,
  },
  emptyText: {
    fontSize: 15,
    color: IOS_SECONDARY_LABEL,
  },

  // Header (Android fallback)
  saveButton: {
    backgroundColor: '#CB30E0',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  saveLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
```

---

## DESIGN TOKEN REFERENCE

### Layout Constants

| Token | Value | Used For |
|---|---|---|
| `INSET_H` | 16 | Horizontal margin for inset grouped cards |
| `GROUP_RADIUS` | 10 | Border radius for inset grouped cards (matches `UITableView.Style.insetGrouped`) |
| `ROW_ICON` | 29 | Icon circle diameter in picker rows |
| `SEP_INSET_LEFT` | 57 (16 + 29 + 12) | Hairline separator left inset, aligned to text column edge |
| Detail card radius | 22 | Matches `radius.card` design token |

### Colors

| Token | Value | Used For |
|---|---|---|
| `IOS_CARD_BG` | `#FFFFFF` | Card/row background |
| `IOS_SEPARATOR` | `rgba(60, 60, 67, 0.24)` | Hairline dividers |
| `IOS_PRIMARY_LABEL` | `#111111` | Primary text |
| `IOS_SECONDARY_LABEL` | `rgba(60, 60, 67, 0.62)` | Secondary/muted text, section headers |
| `IOS_ROW_HIGHLIGHT` | `rgba(120, 120, 128, 0.12)` | Row press highlight |
| Sheet background | `#F5F5F5` | ScrollView background |
| Close button tint | `#8E8E93` | SF Symbol `xmark` and `chevron.backward` |
| Save button tint | `#CB30E0` | Purple accent, `variant: 'prominent'` |
| Manual entry accent | `#007AFF` | System blue for "Enter company manually" |

### Typography

| Context | Size | Weight | Color |
|---|---|---|---|
| Picker row title | 17 | 400 | `IOS_PRIMARY_LABEL` |
| Picker icon letter | 14 | 600 | `IOS_PRIMARY_LABEL` |
| Section header | 13 | 400 | `IOS_SECONDARY_LABEL`, uppercase |
| Detail row label | 15 | 500 | `IOS_SECONDARY_LABEL` |
| Detail row value | 15 | 600 | `IOS_PRIMARY_LABEL` |
| Detail row value (muted) | 15 | 500 | `IOS_SECONDARY_LABEL` |
| Empty state | 15 | 400 | `IOS_SECONDARY_LABEL` |

### Row Dimensions

| Context | Min Height | Padding |
|---|---|---|
| Picker company row | 56 | `paddingLeft: 16, paddingRight: 12, paddingVertical: 10` |
| Picker single-line row | 44 | `paddingVertical: 10` (iOS) / `8` (Android) |
| Detail info row | auto | `paddingHorizontal: 16, paddingVertical: 14, gap: 12` |

### Header Buttons (iOS — SF Symbols via `unstable_headerLeftItems` / `unstable_headerRightItems`)

| Screen | Left | Right |
|---|---|---|
| Picker | `xmark` SF Symbol, tint `#8E8E93`, dismisses sheet | none |
| Details | `chevron.backward` SF Symbol + "Back" label, tint `#8E8E93`, returns to picker | "Save" label, `variant: 'prominent'`, tint `#CB30E0`, dismisses sheet |

---

## HOW THE FLOW WORKS

### State Machine

```
                    ┌─────────────────┐
   + button ──────► │  formSheet opens │
                    │  state: picker   │
                    └────────┬────────┘
                             │
                    tap company row
                             │
                             ▼
                    ┌─────────────────┐
                    │  state: details  │
                    │  companyName set │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
         Back button    Save button    Swipe down
              │              │              │
              ▼              ▼              ▼
        state: picker   parentNav      parentNav
                        .goBack()      .goBack()
                        (dismiss)      (dismiss)
```

### Header Update Mechanism

The `useLayoutEffect` in `AddSubscriptionFlowNavigator` watches `flow.screen` and calls `parentNav.setOptions()` to reconfigure the native header. This happens synchronously before paint (`useLayoutEffect`), so the header updates atomically with the content swap.

When switching to picker: sets `headerSearchBarOptions` with the search callback, `headerLargeTitle: true`, and the close button.

When switching to details: sets `headerSearchBarOptions: undefined` to remove search, `headerLargeTitle: false` for inline title, back button on left, Save on right.

---

## COMMON FAILURES AND FIXES

| Symptom | Root cause | Fix |
|---|---|---|
| FormSheet opens but content is blank white | Using render-prop pattern (`children` function) on the route | Use `component={FlowNavigator}` direct reference only |
| FormSheet opens but content is blank white | Nested `createNativeStackNavigator` inside the formSheet | Remove inner navigator, use state-based view switching |
| Company list not visible, only header shows | `ScrollView` wrapped in a `<View>` container | Make `ScrollView` the direct root of the component |
| Company list starts in the middle of the screen | `contentInsetAdjustmentBehavior` not set or set to `"never"` | Set `contentInsetAdjustmentBehavior="automatic"` |
| Native search bar appears at bottom of screen | `headerSearchBarOptions` set with `placement: 'stacked'` + `allowToolbarIntegration: false` on iOS 26 | Remove placement/integration overrides, use default |
| Search bar breaks layout on repeated open/close | `headerSearchBarOptions` set as static screen options | Set via `useLayoutEffect` + `navigation.setOptions()` inside the component |
| Details screen opens as separate modal on top | Picker and details registered as separate screens in same stack, picker has `presentation: 'formSheet'` | Use single formSheet route with state-based view switching |
| `unstable_headerLeftItems` crashes with "expected boolean got string" | Running in Expo Go instead of dev client build | Use `npx expo run:ios` for dev client build |
| Back button on details is blue instead of gray | `tintColor` not set on the `unstable_headerLeftItems` button | Set `tintColor: '#8E8E93'` |
| Save button looks like plain text | `variant` not set on iOS | Set `variant: 'prominent'` on the `unstable_headerRightItems` button |

---

## WHAT NOT TO DO

1. **Do NOT nest a `createNativeStackNavigator` inside a formSheet route.** It renders blank. Use state-based view switching instead.
2. **Do NOT use a render-prop / children function** on the formSheet `Stack.Screen`. Use `component={}` only.
3. **Do NOT wrap `ScrollView` in a `<View>`** as the screen root. UIKit needs `ScrollView` as the direct first child.
4. **Do NOT set `headerSearchBarOptions` as static screen options** on the formSheet route. Set it dynamically via `setOptions()`.
5. **Do NOT set `contentInsetAdjustmentBehavior="never"`** — it makes the list disappear or start at wrong offset.
6. **Do NOT use `FlatList` or `SectionList`** in the formSheet picker. They have virtualization layout issues in this context. Use `ScrollView` with mapped items.
7. **Do NOT set `presentation: 'formSheet'` on inner screens.** Only the outer flow route should be a formSheet.
8. **Do NOT use `headerTransparent: false`** on the formSheet route. Content must scroll behind the header for the blur effect.
