import { createContext } from 'react'
import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import type { User } from '@/types/auth'

export interface AuthContextType {
  session: Session | null
  user: User | null
  supabaseUser: SupabaseUser | null
  isLoading: boolean
  error: string | null
  
  // Auth actions
  signUp: (email: string, password: string, name: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)