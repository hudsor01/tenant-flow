import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export interface MeData {
  id: string
  email: string
  name?: string | null
  organizationId: string
  organizationName?: string
  role?: string
  permissions?: string[]
  subscription?: {
    status: string
    plan: string
    expiresAt?: Date
  }
}

interface MeState {
  me: MeData | null
  isLoading: boolean
  error: string | null
}

interface MeActions {
  setMe: (me: MeData | null) => void
  clearMe: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

const initialState: MeState = {
  me: null,
  isLoading: false,
  error: null,
}

export const useMeStore = create<MeState & MeActions>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,
        
        setMe: (me) => set((state) => {
          state.me = me
          state.error = null
        }),
        
        clearMe: () => set((state) => {
          state.me = null
          state.error = null
        }),
        
        setLoading: (loading) => set((state) => {
          state.isLoading = loading
        }),
        
        setError: (error) => set((state) => {
          state.error = error
        }),
      })),
      {
        name: 'tenantflow-me-store',
        partialize: (state) => ({
          me: state.me,
        }),
      }
    )
  )
)

// Selectors
export const selectMe = (state: MeState & MeActions) => state.me
export const selectMeLoading = (state: MeState & MeActions) => state.isLoading
export const selectMeError = (state: MeState & MeActions) => state.error

// Hooks
export const useMe = () => useMeStore(selectMe)
export const useMeLoading = () => useMeStore(selectMeLoading)
export const useMeError = () => useMeStore(selectMeError)