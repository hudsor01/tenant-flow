import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from 'zustand/middleware';
import type { User, Session } from '@supabase/supabase-js'

export type AuthState = {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => void
};

export const createAuthStore = (init?: Partial<AuthState>) =>
  createStore<AuthState>()(
    subscribeWithSelector((set, _get) => ({
      user: init?.user ?? null,
      session: init?.session ?? null,
      isAuthenticated: init?.user ? true : false,
      isLoading: init?.isLoading ?? true,
      setUser: (user) => set({ 
        user, 
        isAuthenticated: !!user 
      }),
      setSession: (session) => set({ 
        session,
        user: session?.user ?? null,
        isAuthenticated: !!session?.user
      }),
      setLoading: (loading) => set({ isLoading: loading }),
      signOut: () => set({ 
        user: null, 
        session: null, 
        isAuthenticated: false,
        isLoading: false
      }),
    }))
  );