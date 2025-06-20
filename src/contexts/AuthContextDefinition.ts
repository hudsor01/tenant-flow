import { createContext } from 'react'
import type { User } from '@/types/auth'

export interface AuthContextType {
  user: User | null
  isLoading: boolean
  error: string | null
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  checkSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)