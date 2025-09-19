import { createStore } from "zustand/vanilla";
import { subscribeWithSelector } from 'zustand/middleware';
import type { User as _User, Session as _Session } from '@supabase/supabase-js'
import type { AuthState, AuthUser } from '@repo/shared'

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
        user: session?.user as AuthUser | null ?? null,
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