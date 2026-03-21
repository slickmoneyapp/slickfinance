import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { formatMoney } from '../features/subscriptions/calc';
import type { CurrencyCode } from '../features/subscriptions/types';

const DURATION_MS = 520;

/**
 * Renders a currency amount that counts up/down when the value changes.
 *
 * - **amount**: live total from the store.
 * - **countFrom** (optional): when set (e.g. after navigating back), animates from this value to `amount`.
 *   Needed because remounting would otherwise initialize state at `amount` and skip the animation.
 */
export function AnimatedMoneyAmount({
  amount,
  currency,
  style,
  countFrom,
  onCountComplete,
}: {
  amount: number;
  currency: CurrencyCode;
  style?: StyleProp<TextStyle>;
  /** Explicit start value for the next tick (e.g. total when the screen was left). */
  countFrom?: number;
  onCountComplete?: () => void;
}) {
  const [display, setDisplay] = useState(amount);
  const displayRef = useRef(amount);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const runAnimation = useCallback((from: number, to: number, onDone?: () => void) => {
    if (Math.abs(from - to) < 0.0001) {
      setDisplay(to);
      displayRef.current = to;
      onDone?.();
      return;
    }
    setDisplay(from);
    displayRef.current = from;
    let startTime: number | null = null;
    const fromVal = from;

    const tick = (ts: number) => {
      if (startTime === null) startTime = ts;
      const p = Math.min(1, (ts - startTime) / DURATION_MS);
      const eased = 1 - (1 - p) ** 3;
      const v = fromVal + (to - fromVal) * eased;
      setDisplay(v);
      displayRef.current = v;
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplay(to);
        displayRef.current = to;
        onDone?.();
      }
    };

    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Focus / navigation: animate from saved baseline to current store value
  useEffect(() => {
    if (countFrom === undefined) return;
    const to = amount;
    if (Math.abs(countFrom - to) < 0.0001) {
      onCountComplete?.();
      return;
    }
    runAnimation(countFrom, to, onCountComplete);
  }, [countFrom, amount, runAnimation, onCountComplete]);

  // Same screen: total changed while countFrom is not driving the transition
  useEffect(() => {
    if (countFrom !== undefined) return;
    const to = amount;
    if (Math.abs(to - displayRef.current) < 0.0001) return;
    runAnimation(displayRef.current, to);
  }, [amount, countFrom, runAnimation]);

  return <Text style={style}>{formatMoney(display, currency)}</Text>;
}
