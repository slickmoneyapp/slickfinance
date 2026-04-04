export const colors = {
  bg: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#0B0803',
  textMuted: 'rgba(11,8,3,0.56)',
  textSoft: 'rgba(11,8,3,0.4)',
  borderSoft: 'rgba(11,8,3,0.07)',
  borderSubtle: 'rgba(11,8,3,0.06)',
  primary: '#0B0803',
  success: '#30CE5A',
  accent: '#CB30E0',
} as const;

export const spacing = {
  screenX: 16,
  pageTop: 8,
  sectionGap: 20,
  /** iOS-style section title → grouped card below (Settings, Invest partners, etc.) */
  sectionTitleToCard: 12,
  cardPadding: 16,
  /** Action sheet inner padding — matches Home `content` horizontal padding */
  sheetPaddingX: 16,
  sheetOptionGap: 8,
} as const;

/**
 * Full-screen action sheets — match HomeScreen card / body typography (SF Pro Display).
 */
export const sheetTypography = {
  title: {
    fontFamily: 'SF Pro Display',
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#000000',
    marginBottom: 12,
  },
  section: {
    fontFamily: 'SF Pro Display',
    fontSize: 13,
    fontWeight: '600' as const,
    color: '#616161',
    marginTop: 8,
    marginBottom: 8,
  },
  option: {
    fontFamily: 'SF Pro Display',
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#171717',
  },
  optionMuted: {
    fontFamily: 'SF Pro Display',
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#616161',
  },
  search: {
    fontFamily: 'SF Pro Display',
    fontSize: 15,
    fontWeight: '400' as const,
    color: '#000000',
  },
  inlineLabel: {
    fontFamily: 'SF Pro Display',
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#616161',
  },
  done: {
    fontFamily: 'SF Pro Display',
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
} as const;

export const radius = {
  card: 22,
  button: 12,
  pill: 999,
} as const;

export const typeScale = {
  pageTitle: { fontSize: 28, fontWeight: '800' as const, color: colors.text },
  sectionLabel: { fontSize: 12, fontWeight: '700' as const, color: colors.textMuted },
  body: { fontSize: 14, fontWeight: '500' as const, color: colors.textMuted },
  button: { fontSize: 14, fontWeight: '700' as const },
} as const;

/**
 * Typography / colors aligned to Figma **Budgeting App** file.
 *
 * Primary reference frame: **Subscriptions list** — node `273:1518`
 * `https://www.figma.com/design/b6SpQd4YKwrRuBWIb0aCXR/Budgeting-App?node-id=273-1518`
 *
 * When Dev Mode values in Figma change, update here first, then screens inherit.
 */
export const figma = {
  /** Node id (for docs / API scripts) */
  nodeSubscriptionsList: '273:1518',

  /**
   * Screen title — 30px / #000; letter-spacing -3% (-0.9px in RN).
   * Use **only** `BricolageGrotesque_800ExtraBold` — do **not** set `fontWeight` (double-bold can clip on iOS).
   * `lineHeight` must be tall enough for the font’s ascent/tittles (RN line box clips otherwise).
   */
  screenTitle: {
    fontFamily: 'BricolageGrotesque_800ExtraBold',
    fontSize: 30,
    lineHeight: 52,
    /** RN uses px; -3% of font size → -0.03 × 30 */
    letterSpacing: -0.9,
    color: '#000000',
  },
  /**
   * Hero amount ($609…) — Figma lineHeightPx ~44.8 is &lt; fontSize 56 → clips in RN.
   * Use lineHeight ≥ fontSize (58–60) so ascenders/descenders render.
   */
  heroNumber: {
    fontSize: 56,
    fontWeight: '800' as const,
    letterSpacing: -1.68,
    lineHeight: 58,
    color: colors.text,
  },
  caption: '#616161',
  /** Top wash (cyan from radial gradient in file) */
  gradientTop: 'rgba(48, 174, 224, 0.12)',

  /** Borders / hairlines used on Subscriptions (273:1518) */
  border: {
    default: '#E8E8E8',
    /** Row separators inside list card */
    divider: 'rgba(11,8,3,0.12)',
  },

  /**
   * Subscriptions — frame 273:1518 (“Updated”). SF Pro sizes/weights from API;
   * RN uses the system UI font on iOS and sans-serif on Android.
   */
  subscriptions273: {
    /** Title text: 36px from left; 54px below safe top — applied only to title column, not trailing actions */
    contentPaddingX: 36,
    titleColumnPaddingTop: 54,
    cardInsetX: 16,
    /** contentPaddingX − cardInsetX — use inside scroll when parent has cardInsetX */
    textColumnGutterX: 20,

    spendingBlockMarginBottom: 20,
    /** Vertical gap from page title to “Spending in …” (Subscriptions 273:1518; tightened −20% vs 56) */
    titleToSpendingGroupGap: 45,
    /**
     * Sum of `PageHeader` figma branch `paddingBottom` (12) + `listContent` `paddingTop` (4).
     * spendingBlock `marginTop` = `titleToSpendingGroupGap` − this value.
     */
    spendingGroupPredecessorStack: 16,
    /** Space between “Spending in …” label and monthly hero amount */
    spendingGroupRowGap: 20,
    /** Between monthly hero and annual line — 30% tighter than `spendingGroupRowGap` (20 × 0.7) */
    spendingGroupHeroToAnnualGap: 14,
    /** Frame 7: auto-layout gap between Filter / Calendar View */
    pillRowGap: 8,
    pillRowMarginBottom: 20,
    listCardRadius: 22,
    /** List row: logo + text + price (node Group 14 / 16) */
    rowGap: 14,
    rowPaddingH: 16,
    rowPaddingV: 16,
    logoSize: 56,
    settingsButtonSize: 40,
    shadow: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 6 },
      elevation: 2,
    },
    settingsShadow: {
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    /** Frame 5 / 6: white pills, radius 30, pad 16×10, no stroke in file */
    pill: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 30,
      borderWidth: 0,
      backgroundColor: '#FFFFFF',
    },
    /** "Spending in March" — TEXT 273:1541: SF Pro Semibold 16 / 19 (Figma) */
    spendingContext: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 19,
      color: '#000000',
    },
    /** "$2820/year" — TEXT 273:1543: Medium 16, line ~19 */
    spendingYearly: {
      fontSize: 16,
      fontWeight: '500' as const,
      lineHeight: 19,
      color: '#616161',
    },
    /** Filter / Calendar View — TEXT 273:1701: Semibold 14, line ~16.7 */
    pillLabel: {
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 16.7,
      color: '#616161',
    },
    /** Netflix / Spotify name — TEXT 273:1690: Semibold 16, line ~19 */
    rowTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 19,
      color: '#171717',
    },
    /** "Next Billing Today" — TEXT 273:1688: Medium 14, line ~16.7 */
    rowBilling: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 16.7,
      color: '#616161',
    },
    /** "$500/ mo" — TEXT 273:1691: Semibold 16, line ~19 */
    rowPrice: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 19,
      color: colors.text,
    },
    /** "Active" — TEXT 273:1689: Medium 14, line ~16.7 */
    rowStatus: {
      marginTop: 4,
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 16.7,
    },
    statusActive: '#23B953',
    /** Rectangle 9 divider between rows — 50% #D9D9D9 */
    listDivider: 'rgba(217, 217, 217, 0.5)',
    /**
     * Bar behind “Add Transaction” (273:2177).
     * **`paddingBottom` in Figma = 56px from the physical bottom of the screen, including the
     * home-indicator safe area.** Inside `SafeAreaView`, implement as `max(0, 56 - insets.bottom)`
     * on the bar so `insets.bottom + paddingBottom === 56`.
     * **Gradient:** transparent at top → `colors.bg` (#F5F5F5) at bottom so list rows fade, not clip.
     */
    addTransactionBar: {
      paddingLeft: 36,
      /** Total distance from physical bottom to button baseline (includes safe area). */
      paddingBottomFromScreen: 56,
      /** Fade zone above the button (gradient 0% → 100% spans overlay height). */
      gradientFadeHeight: 48,
      /** Space between fade and pill button. */
      buttonRowTopPadding: 8,
    },
    /** Button "Add Transaction" — INSTANCE 273:2177: hug width, left-aligned; not edge-to-edge */
    bottomCta: {
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderRadius: 1000,
      fontSize: 17,
      fontWeight: '400' as const,
      lineHeight: 22,
      letterSpacing: -0.43,
      iconLabelGap: 4,
    },
  },
} as const;

