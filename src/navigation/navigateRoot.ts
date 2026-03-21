type Nav = {
  navigate: (name: string, params?: object) => void;
  getParent?: () => Nav | undefined;
};

/**
 * Navigate on the root stack (modals, detail).
 * - Subscriptions as **stack** screen: uses `navigation` directly.
 * - Subscriptions inside **tabs**: walks up (tab → stack) so modals register on the root stack.
 */
export function navigateRoot(navigation: Nav, name: string, params?: object) {
  const p1 = navigation.getParent?.();
  const p2 = p1?.getParent?.();
  const target = p2 ?? p1 ?? navigation;
  target.navigate(name, params);
}
