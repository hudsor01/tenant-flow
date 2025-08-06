import { create } from 'zustand'
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

export type Theme = 'light' | 'dark' | 'system'
export type ViewMode = 'grid' | 'list' | 'compact'

interface UIState {
  // Theme preferences
  theme: Theme
  
  // Layout preferences
  sidebarOpen: boolean
  sidebarCollapsed: boolean
  compactMode: boolean
  
  // View preferences
  defaultViewMode: ViewMode
  tablesDensity: 'comfortable' | 'compact' | 'spacious'
  
  // Accessibility
  reducedMotion: boolean
  highContrast: boolean
  fontSize: 'small' | 'medium' | 'large'
  
  // Network status
  isOnline: boolean
  connectionSpeed: 'slow' | 'fast' | 'unknown'
}

interface UIActions {
  // Theme actions
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  
  // Sidebar actions
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  
  // Layout actions
  setCompactMode: (compact: boolean) => void
  toggleCompactMode: () => void
  
  // View preferences
  setDefaultViewMode: (mode: ViewMode) => void
  setTablesDensity: (density: UIState['tablesDensity']) => void
  
  // Accessibility
  setReducedMotion: (reduced: boolean) => void
  setHighContrast: (high: boolean) => void
  setFontSize: (size: UIState['fontSize']) => void
  
  // Network status
  setOnlineStatus: (online: boolean) => void
  setConnectionSpeed: (speed: UIState['connectionSpeed']) => void
  
  // Utility
  reset: () => void
  applySystemPreferences: () => void
}

const initialState: UIState = {
  theme: 'system',
  sidebarOpen: true,
  sidebarCollapsed: false,
  compactMode: false,
  defaultViewMode: 'grid',
  tablesDensity: 'comfortable',
  reducedMotion: false,
  highContrast: false,
  fontSize: 'medium',
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  connectionSpeed: 'unknown',
}

export const useUIStore = create<UIState & UIActions>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,
          
          // Theme actions
          setTheme: (theme) => set((state) => {
            state.theme = theme
            // Apply theme to document
            if (typeof document !== 'undefined') {
              const root = document.documentElement
              root.classList.remove('light', 'dark')
              
              if (theme === 'system') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
                root.classList.add(prefersDark ? 'dark' : 'light')
              } else {
                root.classList.add(theme)
              }
            }
          }, false, 'setTheme'),
          
          toggleTheme: () => set((state) => {
            const themes: Theme[] = ['light', 'dark', 'system']
            const currentIndex = themes.indexOf(state.theme)
            const nextTheme = themes[(currentIndex + 1) % themes.length]
            if (nextTheme) {
              get().setTheme(nextTheme)
            }
          }, false, 'toggleTheme'),
          
          // Sidebar actions
          setSidebarOpen: (open) => set((state) => {
            state.sidebarOpen = open
          }, false, 'setSidebarOpen'),
          
          toggleSidebar: () => set((state) => {
            state.sidebarOpen = !state.sidebarOpen
          }, false, 'toggleSidebar'),
          
          setSidebarCollapsed: (collapsed) => set((state) => {
            state.sidebarCollapsed = collapsed
          }, false, 'setSidebarCollapsed'),
          
          // Layout actions
          setCompactMode: (compact) => set((state) => {
            state.compactMode = compact
          }, false, 'setCompactMode'),
          
          toggleCompactMode: () => set((state) => {
            state.compactMode = !state.compactMode
          }, false, 'toggleCompactMode'),
          
          // View preferences
          setDefaultViewMode: (mode) => set((state) => {
            state.defaultViewMode = mode
          }, false, 'setDefaultViewMode'),
          
          setTablesDensity: (density) => set((state) => {
            state.tablesDensity = density
          }, false, 'setTablesDensity'),
          
          // Accessibility
          setReducedMotion: (reduced) => set((state) => {
            state.reducedMotion = reduced
            // Apply to document
            if (typeof document !== 'undefined') {
              document.documentElement.classList.toggle('reduce-motion', reduced)
            }
          }, false, 'setReducedMotion'),
          
          setHighContrast: (high) => set((state) => {
            state.highContrast = high
            // Apply to document
            if (typeof document !== 'undefined') {
              document.documentElement.classList.toggle('high-contrast', high)
            }
          }, false, 'setHighContrast'),
          
          setFontSize: (size) => set((state) => {
            state.fontSize = size
            // Apply to document
            if (typeof document !== 'undefined') {
              const root = document.documentElement
              root.classList.remove('text-small', 'text-medium', 'text-large')
              root.classList.add(`text-${size}`)
            }
          }, false, 'setFontSize'),
          
          // Network status
          setOnlineStatus: (online) => set((state) => {
            state.isOnline = online
          }, false, 'setOnlineStatus'),
          
          setConnectionSpeed: (speed) => set((state) => {
            state.connectionSpeed = speed
          }, false, 'setConnectionSpeed'),
          
          // Utility
          reset: () => set(initialState, false, 'reset'),
          
          applySystemPreferences: () => {
            if (typeof window === 'undefined') return
            
            const state = get()
            
            // Check for reduced motion preference
            const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            if (prefersReducedMotion !== state.reducedMotion) {
              state.setReducedMotion(prefersReducedMotion)
            }
            
            // Check for high contrast preference
            const prefersHighContrast = window.matchMedia('(prefers-contrast: high)').matches
            if (prefersHighContrast !== state.highContrast) {
              state.setHighContrast(prefersHighContrast)
            }
            
            // Apply theme if set to system
            if (state.theme === 'system') {
              state.setTheme('system')
            }
          },
        }))
      ),
      {
        name: 'tenantflow-ui-store',
        version: 1,
        // Persist all UI preferences
        partialize: (state) => ({
          theme: state.theme,
          sidebarOpen: state.sidebarOpen,
          sidebarCollapsed: state.sidebarCollapsed,
          compactMode: state.compactMode,
          defaultViewMode: state.defaultViewMode,
          tablesDensity: state.tablesDensity,
          reducedMotion: state.reducedMotion,
          highContrast: state.highContrast,
          fontSize: state.fontSize,
        }),
      }
    ),
    {
      name: 'TenantFlow UI Store',
    }
  )
)

// Selectors
export const selectTheme = (state: UIState & UIActions) => state.theme
export const selectSidebar = (state: UIState & UIActions) => ({
  open: state.sidebarOpen,
  collapsed: state.sidebarCollapsed,
})
export const selectLayout = (state: UIState & UIActions) => ({
  compactMode: state.compactMode,
  viewMode: state.defaultViewMode,
  tablesDensity: state.tablesDensity,
})
export const selectAccessibility = (state: UIState & UIActions) => ({
  reducedMotion: state.reducedMotion,
  highContrast: state.highContrast,
  fontSize: state.fontSize,
})
export const selectNetworkStatus = (state: UIState & UIActions) => ({
  isOnline: state.isOnline,
  connectionSpeed: state.connectionSpeed,
})

// Hooks
export const useTheme = () => useUIStore((state) => ({
  theme: state.theme,
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
}))

export const useSidebar = () => useUIStore((state) => ({
  open: state.sidebarOpen,
  collapsed: state.sidebarCollapsed,
  setSidebarOpen: state.setSidebarOpen,
  toggleSidebar: state.toggleSidebar,
  setSidebarCollapsed: state.setSidebarCollapsed,
}))

export const useLayout = () => useUIStore((state) => ({
  compactMode: state.compactMode,
  viewMode: state.defaultViewMode,
  tablesDensity: state.tablesDensity,
  setCompactMode: state.setCompactMode,
  toggleCompactMode: state.toggleCompactMode,
  setDefaultViewMode: state.setDefaultViewMode,
  setTablesDensity: state.setTablesDensity,
}))

export const useAccessibility = () => useUIStore((state) => ({
  reducedMotion: state.reducedMotion,
  highContrast: state.highContrast,
  fontSize: state.fontSize,
  setReducedMotion: state.setReducedMotion,
  setHighContrast: state.setHighContrast,
  setFontSize: state.setFontSize,
}))

export const useIsOnline = () => useUIStore((state) => state.isOnline)

// Side effects for browser integration
if (typeof window !== 'undefined') {
  const store = useUIStore.getState()
  
  // Online/offline detection
  window.addEventListener('online', () => store.setOnlineStatus(true))
  window.addEventListener('offline', () => store.setOnlineStatus(false))
  
  // Connection speed detection
  if ('connection' in navigator && 'effectiveType' in (navigator as { connection: { effectiveType: string; addEventListener: (type: string, listener: () => void) => void } }).connection) {
    const connection = (navigator as { connection: { effectiveType: string; addEventListener: (type: string, listener: () => void) => void } }).connection
    const updateConnectionSpeed = () => {
      const speed = connection.effectiveType === '4g' ? 'fast' : 'slow'
      store.setConnectionSpeed(speed)
    }
    connection.addEventListener('change', updateConnectionSpeed)
    updateConnectionSpeed()
  }
  
  // System preference detection
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (store.theme === 'system') {
      store.setTheme('system')
    }
  })
  
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
    store.setReducedMotion(e.matches)
  })
  
  window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
    store.setHighContrast(e.matches)
  })
  
  // Apply initial preferences
  store.applySystemPreferences()
}