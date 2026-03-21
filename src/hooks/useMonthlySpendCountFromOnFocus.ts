import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { monthlySpendTotal } from '../features/subscriptions/calc';
import { useSubscriptionsStore } from '../features/subscriptions/store';

/**
 * When the screen blurs, stores the current monthly subscription total; on focus, if it changed,
 * exposes `countFrom` so `AnimatedMoneyAmount` can count from the previous value.
 */
export function useMonthlySpendCountFromOnFocus() {
  const lastBlurMonthlyRef = useRef<number | null>(null);
  const [countFrom, setCountFrom] = useState<number | undefined>(undefined);
  const onCountComplete = useCallback(() => setCountFrom(undefined), []);

  useFocusEffect(
    useCallback(() => {
      const prev = lastBlurMonthlyRef.current;
      const current = monthlySpendTotal(useSubscriptionsStore.getState().items);
      if (prev !== null && Math.abs(prev - current) > 0.0001) {
        setCountFrom(prev);
      } else {
        setCountFrom(undefined);
      }
      return () => {
        lastBlurMonthlyRef.current = monthlySpendTotal(useSubscriptionsStore.getState().items);
      };
    }, [])
  );

  return { countFrom, onCountComplete };
}
