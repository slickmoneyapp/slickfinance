import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';

type AuthState = {
  session: Session | null;
  user: User | null;
  initialized: boolean;
  loading: boolean;
  currentProvider: 'apple' | 'google' | null;

  initialize: () => () => void;
  setCurrentProvider: (provider: 'apple' | 'google') => void;
  signOut: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set) => ({
  session: null,
  user: null,
  initialized: false,
  loading: true,
  currentProvider: null,

  initialize: () => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ session, user: session?.user ?? null, initialized: true, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, loading: false });
    });

    return () => subscription.unsubscribe();
  },

  setCurrentProvider: (provider) => set({ currentProvider: provider }),

  signOut: async () => {
    set({ loading: true });
    await supabase.auth.signOut();
    set({ session: null, user: null, loading: false, currentProvider: null });
  },
}));
