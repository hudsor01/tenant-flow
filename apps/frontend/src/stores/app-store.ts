import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'

interface AppState {
    // User state
    user: User | null
    isAuthenticated: boolean
    isLoading: boolean
    
    // UI state
    sidebarOpen: boolean
    theme: 'light' | 'dark' | 'system'
    
    // Actions
    setUser: (user: User | null) => void
    setIsLoading: (loading: boolean) => void
    toggleSidebar: () => void
    setSidebarOpen: (open: boolean) => void
    setTheme: (theme: 'light' | 'dark' | 'system') => void
    reset: () => void
}

const initialState = {
    user: null,
    isAuthenticated: false,
    isLoading: true,
    sidebarOpen: true,
    theme: 'system' as const,
}

export const useAppStore = create<AppState>()(
    devtools(
        persist(
            (set) => ({
                ...initialState,
                
                setUser: (user) => set(() => ({
                    user,
                    isAuthenticated: !!user,
                }), false, 'setUser'),
                
                setIsLoading: (loading) => set({ isLoading: loading }, false, 'setIsLoading'),
                
                toggleSidebar: () => set((state) => ({
                    sidebarOpen: !state.sidebarOpen
                }), false, 'toggleSidebar'),
                
                setSidebarOpen: (open) => set({ sidebarOpen: open }, false, 'setSidebarOpen'),
                
                setTheme: (theme) => set({ theme }, false, 'setTheme'),
                
                reset: () => set(initialState, false, 'reset'),
            }),
            {
                name: 'tenantflow-app-store',
                partialize: (state) => ({
                    theme: state.theme,
                    sidebarOpen: state.sidebarOpen,
                }),
            }
        )
    )
)

// Selectors
export const selectUser = (state: AppState) => state.user
export const selectIsAuthenticated = (state: AppState) => state.isAuthenticated
export const selectIsLoading = (state: AppState) => state.isLoading
export const selectSidebarOpen = (state: AppState) => state.sidebarOpen
export const selectTheme = (state: AppState) => state.theme