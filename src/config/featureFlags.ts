/**
 * **Figma layout:** one full-screen root (Subscriptions) — no bottom tab bar.
 * Set `false` to restore the classic tab navigator (Home / Subscriptions / Settings).
 */
export const USE_FIGMA_SINGLE_PAGE_NAV = false;

/**
 * Flip these on when Budget / Invest are ready for the tab bar.
 * Screens stay in the codebase; tabs are hidden when false.
 */
export const ENABLE_BUDGET_TAB = false;
export const ENABLE_INVEST_TAB = false;

/** Home: show hero “Available to Spend” + big total + delta */
export const SHOW_HOME_HERO_TOTALS = false;

/** Home: “April Remaining Budget” card */
export const SHOW_HOME_BUDGET_CARD = false;
