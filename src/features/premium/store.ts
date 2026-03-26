import { create } from 'zustand';
import { adapty } from 'react-native-adapty';

type PremiumState = {
  isPremium: boolean;
  loading: boolean;
  checkAccess: () => Promise<void>;
  setIsPremium: (value: boolean) => void;
};

export const usePremiumStore = create<PremiumState>((set) => ({
  isPremium: false,
  loading: true,

  checkAccess: async () => {
    try {
      const profile = await adapty.getProfile();
      const hasAccess = profile.accessLevels?.['premium']?.isActive === true;
      set({ isPremium: hasAccess, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  setIsPremium: (value) => set({ isPremium: value }),
}));
