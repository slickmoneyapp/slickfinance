# Add Subscription FormSheet Flow — Implementation Reference (Slickfinance)

> **Use with an AI assistant:** This file describes how the **add-subscription modal** is implemented in this repo, critical navigation constraints, and how it relates to **subscription detail (read-only)** and **edit** so you can build a consistent **preview / edit** experience without fighting `react-native-screens`.

**Canonical source file:** `src/navigation/AddSubscriptionStack.tsx` (~1200+ lines: picker, details form, styles). Do not treat older embedded snippets in git history as source of truth—**read the file**.

---

## CRITICAL: What makes or breaks this

This flow is a **native iOS formSheet** (`UIModalPresentationFormSheet`) presented from the **root** `createNativeStackNavigator` in `App.tsx`. Inside it, two logical views (company picker and subscription details) are managed with **React state**, not a nested navigator.

**You CANNOT nest a `createNativeStackNavigator` inside another native stack's `formSheet` route.** The inner navigator often renders a blank white screen. This is a known limitation of `react-native-screens`. The workaround is a single component (`AddSubscriptionFlowNavigator`) that uses `useLayoutEffect` + `parentNav.setOptions()` to update the native header as the user moves between picker and details.

**Other critical rules:**

1. The **picker** view's root must be a `ScrollView` — NOT wrapped in a `<View>`. UIKit needs the `ScrollView` as the direct root to connect `contentInsetAdjustmentBehavior` and `headerSearchBarOptions` to the navigation controller.

2. `contentInsetAdjustmentBehavior="automatic"` (or `scrollableAxes` where used) must be set on scroll views in the flow so content does not sit under the transparent header incorrectly.

3. `headerSearchBarOptions` must be set via `useLayoutEffect` + `navigation.setOptions()` from within the flow component — **not** only as static options on the route. Static-only search bar config is a common cause of broken layout on formSheet routes.

4. When switching from picker → details, set `headerSearchBarOptions: undefined` to remove the search bar.

5. On iOS, prefer `unstable_headerLeftItems` / `unstable_headerRightItems` for native `UIBarButtonItem` + SF Symbols. On Android, use `headerLeft` / `headerRight` with React components.

6. The formSheet route must use `component={AddSubscriptionFlowNavigator}` as a **direct reference**. **Do NOT** use a render function / render prop for the screen component — it can cause a blank sheet.

---

## ARCHITECTURE OVERVIEW (current repo)

```
Root Stack (App.tsx — createNativeStackNavigator, RootStackParamList)
  ├── "Tabs" (createNativeBottomTabNavigator) — headerShown: false
  │     ├── Subscriptions tab → SubsStack → SubscriptionsScreen
  │     ├── Budget / Invest / Settings (feature flags)
  │     └── "+" in header uses navigateRoot(..., 'AddSubscription')
  │
  ├── "AddSubscription" (presentation: formSheet iOS / modal Android)
  │     component: AddSubscriptionFlowNavigator  ← single component, NO inner Stack
  │
  ├── "SubscriptionDetail" (formSheet / modal) — read-only detail
  ├── "EditSubscription" (formSheet / modal, headerShown: false) — full editor
  └── "Paywall"
```

**Key insight:** `AddSubscription` is **not** registered on the tab’s inner stack. It lives on the **root** stack so it can be opened from any tab via `navigateRoot` (see `src/navigation/navigateRoot.ts`).

**Inside `AddSubscriptionFlowNavigator`:** there is **no** inner `Stack.Navigator`. Two “screens” are conditional renders:

| `flow.screen` | Renders | Header (via `parentNav.setOptions`) |
|---------------|---------|-------------------------------------|
| `'picker'` | `PickerBody` | Title "Add Subscription", large title, search bar, close (×) |
| `'details'` | `DetailsBody` | Title "Details", back → picker, **Save** → `saveRef.current()` |

---

## FLOW STATE & PARAMS (actual types)

From `AddSubscriptionStack.tsx`:

```typescript
type ParentStackParamList = { AddSubscription: undefined };

export type AddSubscriptionFlowParamList = {
  CompanyPicker: undefined;
  Details: { companyName: string; domain: string; category: string };
};

type FlowState =
  | { screen: 'picker' }
  | {
      screen: 'details';
      companyName: string;
      domain: string;
      category: string;
      price: number; // from catalog template, can be 0
    };
```

- **`saveRef`:** `useRef<(() => Promise<void>) | null>(null)` is assigned `DetailsBody`'s save handler so the **native header Save button** can call it without prop drilling through `setOptions` closures.

---

## WHERE THINGS LIVE ON DISK

```
App.tsx                          ← Root stack: AddSubscription, SubscriptionDetail, EditSubscription
src/navigation/
  AddSubscriptionStack.tsx       ← AddSubscriptionFlowNavigator, PickerBody, DetailsBody, styles
  navigateRoot.ts                ← Walks parent navigators to reach root stack
src/features/subscriptions/
  addSubscriptionCatalog.ts      ← POPULAR_SERVICES_BY_SECTION, currencies, billing cycles, categories
  store.ts                       ← add() → Supabase insert + withHistory
  buildBillingHistoryFromSubscription.ts  ← derived billing history after save
src/utils/brandSearch.ts         ← searchBrands() for picker API search (debounced)
src/screens/
  SubscriptionDetailScreen.tsx   ← Read-only “preview” of saved subscription
  EditSubscriptionScreen.tsx     ← Edit existing subscription (separate UI from DetailsBody)
```

**Note:** `src/constants/subscriptionCompanies.ts` exists but the **add flow picker** is driven primarily by `POPULAR_SERVICES_BY_SECTION` / `ServiceTemplate` in `addSubscriptionCatalog.ts`, plus **remote** `searchBrands` results—not by importing `SUBSCRIPTION_COMPANIES` in `AddSubscriptionStack.tsx`.

---

## ROOT ROUTE REGISTRATION (`App.tsx`)

Relevant excerpt (options may drift—verify file):

- **Name:** `AddSubscription`
- **Component:** `AddSubscriptionFlowNavigator`
- **Presentation:** `Platform.OS === 'ios' ? 'formSheet' : 'modal'`
- **Header:** transparent, large title style, blur on older iOS, etc.

`RootStackParamList` includes:

```typescript
AddSubscription: undefined;
SubscriptionDetail: { subscriptionId: string };
EditSubscription: { subscriptionId: string };
```

Opening the add flow from a tab screen:

```typescript
navigateRoot(navigation as any, 'AddSubscription');
```

---

## PICKER (`PickerBody`) — BEHAVIOR

- **ScrollView** root for the picker list (see critical rules above).
- **Sections:** Popular services from `POPULAR_SERVICES_BY_SECTION` (per section headers); rows use `CompanyLogo` + name + subtitle (`formatStartingPrice` / category).
- **Search:** `headerSearchBarOptions` updates `searchText` state.
  - **Local filter:** matches catalog `ServiceTemplate` items when `searchText` is non-empty.
  - **API:** debounced (~350ms) `searchBrands(trimmedQuery)` merges in `BrandResult`s not already in local matches.
- **Loading / empty states:** `ActivityIndicator` and empty copy when relevant.
- **Manual entry:** row that sets flow to details with empty/`custom` handling (see implementation for exact `setFlow` payload).

Selecting a row calls:

`onSelectCompany(name, domain, category, price)` → `setFlow({ screen: 'details', companyName, domain, category, price })`.

---

## DETAILS (`DetailsBody`) — “PREVIEW” FOR NEW SUBSCRIPTIONS

There is **no separate route** named Preview. The **details step** is the preview: a **live form** whose **hero** (logo, editable name, price line, chip row) updates as state changes.

### Structure (conceptual)

1. **Hero block (`heroCard`)**  
   - Logo: `CompanyLogo` + `domain`, or letter fallback.  
   - **Service name:** `TextInput` (`serviceName`).  
   - **Price line:** `Text` — `{symbol}{price} / {cycleShort}` (e.g. `mo`, `wk`).  
   - **Horizontal chips:** `MenuView` (@react-native-menu/menu) for **currency**, **billing cycle**, **category** (scrolls horizontally).

2. **Grouped cards (iOS grouped style)**  
   - Amount (`TextInput`, decimal stripped).  
   - **Schedule:** `DateTimePicker` (compact) payment date, subscription start, trial switch + trial length menu.  
   - **Organization:** list, payment method.  
   - **Reminders:** renewal switch, days, time (parsed with `parseTime`).  
   - **Notes** optional.

3. **State**  
   - Local `useState` for all fields.  
   - `subscriptionStartDate` syncs from `nextCharge` in a `useEffect` until user changes start (`subscriptionStartTouchedRef`).

### Save

- **Save** in header invokes `saveRef.current()` → validates → `useSubscriptionsStore.add({ ... })`.  
- **Persistence:** Supabase `subscriptions` insert via `store.add`; then `withHistory(fromDbRow(...))` attaches **client-derived** `billingHistory`.  
- **Dismiss:** `onDismiss` → `parentNav.goBack()`.

### iOS Save button styling

- `iosMajorVersion() >= 26` → `variant: 'prominent'` on Save bar button item; else `'done'`, with `labelStyle` when prominent (see file). Tint `#CB30E0` (`SAVE_HEADER_PURPLE`).

---

## READ-ONLY “PREVIEW” — `SubscriptionDetailScreen`

- **Route:** `SubscriptionDetail` with `{ subscriptionId: string }`.  
- **Data:** `useSubscriptionsStore` → `items.find` by id (must be hydrated).  
- **UI:** Centered hero (logo, name, price/cycle, status badge), **Information** rows (next payment, subscription start, cycle, payment method, category, list, total spent, reminder, etc.), **Billing history** (from `subscription.billingHistory`), optional notes.  
- **Actions:** Mark cancelled / active, delete.  
- **Edit:** Header **Edit** → `navigation.navigate('EditSubscription', { subscriptionId })`.

This is the correct reference for a **read-only preview** of an **existing** subscription. Align copy, spacing, and field order with this screen when building a dedicated preview component.

---

## EDIT — `EditSubscriptionScreen`

- **Route:** `EditSubscription`, `{ subscriptionId: string }`.  
- **Options:** `headerShown: false` — screen uses custom header / `AppScreen` patterns inside the file.  
- **State:** Initialized from the same `sub` in Zustand; **not** the same component as `DetailsBody` (different layout: action sheets, modals for pickers, category search, etc.).  
- **Save:** `update(id, patch)` → Supabase update + store merge; **rebuilds `billingHistory`** when start date, cycle, price, currency, or custom cycle days change (`store.ts`).

When building **edit** to match **add**, reuse **field list and validation rules**, but expect **different UI primitives** (modals vs inline `DateTimePicker`, etc.) unless you refactor to a shared `SubscriptionDetailsForm`.

---

## DESIGN TOKENS & THEMING

- Prefer `colors`, `figma`, `spacing` from `src/ui/theme.ts` where the implementation already does.  
- Dynamic iOS colors use `DynamicColorIOS` for light/dark parity (`IOS_CARD_BG`, `IOS_SECONDARY`, …) in `AddSubscriptionStack.tsx`.  
- Hero / chip metrics and comments in-file (e.g. chip row aligns to 36px from screen edge) — **read styles in `AddSubscriptionStack.tsx`**.

---

## STATE MACHINE (UPDATED)

```
                    ┌──────────────────────────┐
 navigateRoot       │  Root stack presents     │
 'AddSubscription' ─►│  formSheet / modal      │
                     │  flow.screen: 'picker'   │
                     └────────────┬─────────────┘
                                  │
                     tap service / manual entry
                                  │
                                  ▼
                     ┌──────────────────────────┐
                     │  flow.screen: 'details'   │
                     │  + companyName, domain,   │
                     │    category, price        │
                     │  DetailsBody + saveRef   │
                     └────────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
         Back (header)      Save (header)      Close (picker only)
              │                   │                   │
              ▼                   ▼                   ▼
     flow: 'picker'        add() + goBack()     parentNav.goBack()
                           dismiss sheet        (dismiss sheet)
```

---

## COMMON FAILURES AND FIXES

| Symptom | Root cause | Fix |
|--------|------------|-----|
| FormSheet opens blank | Render-prop `Screen` component | Use `component={AddSubscriptionFlowNavigator}` only |
| FormSheet opens blank | Nested stack inside formSheet | Single component + `flow` state (current approach) |
| List layout wrong under large title | ScrollView not root / wrong `contentInsetAdjustmentBehavior` | Match `PickerBody` / `DetailsBody` scroll props |
| Search bar layout broken | Static `headerSearchBarOptions` only | Dynamic `setOptions` in `useLayoutEffect` |
| Save does nothing | Header still wired to `dismiss` | Save must call `saveRef.current()` (current code) |
| Add opens from wrong navigator | Navigating on tab stack only | Use `navigateRoot` to root stack |

---

## WHAT NOT TO DO

1. Do **not** nest `createNativeStackNavigator` inside the `AddSubscription` route.  
2. Do **not** use a render function for the `AddSubscription` screen `component` prop.  
3. Do **not** wrap the **picker** `ScrollView` in an outer `View` as the screen root.  
4. Do **not** assume `subscriptionCompanies.ts` powers the picker—verify `addSubscriptionCatalog` + `brandSearch`.  
5. Do **not** conflate **details step** (unsaved local state) with **SubscriptionDetail** (persisted)—different routes and data sources.

---

## CHECKLIST FOR A NEW “PREVIEW / EDIT” PAGE

Use this when adding a unified preview+edit experience:

| Goal | Source of truth in repo |
|------|-------------------------|
| Match **add** hero + fields | `DetailsBody` in `AddSubscriptionStack.tsx` |
| Match **read-only** layout | `SubscriptionDetailScreen.tsx` |
| Match **edit** behavior & persistence | `EditSubscriptionScreen.tsx` + `store.update` |
| Shared form fields (future refactor) | Extract or align with `SubscriptionDetailsForm` if present in tree |

**End of document.**
