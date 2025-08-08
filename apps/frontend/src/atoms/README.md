# Jotai Atomic State Management

This directory contains the atomic state management implementation using Jotai for the TenantFlow Next.js 15 application.

## Architecture Overview

### Core Philosophy
- **Atomic State**: Each piece of state is an independent atom
- **Bottom-Up**: Compose complex state from simple atoms
- **Performance**: Only components using specific atoms re-render
- **Type Safety**: Full TypeScript integration with automatic inference

### Directory Structure

```
atoms/
├── core/           # Core application state
│   └── user.ts     # Authentication and user state
├── ui/             # UI-specific state
│   ├── theme.ts    # Theme and preferences
│   ├── notifications.ts  # Notification system
│   └── modals.ts   # Modal state management
├── business/       # Business logic state
│   ├── properties.ts     # Property management
│   └── tenants.ts        # Tenant management
├── server/         # Server state with TanStack Query
│   ├── queries.ts  # Query atoms for data fetching
│   └── mutations.ts # Mutation atoms for data updates
└── index.ts        # Main exports
```

## Key Features

### 1. Atomic Reactivity
```typescript
// Only components using userAtom will re-render when user changes
export const userAtom = atom<User | null>(null)

// Derived atoms automatically update
export const isAuthenticatedAtom = atom((get) => get(userAtom) !== null)
```

### 2. Persistence
```typescript
// Automatic localStorage sync
export const themeAtom = atomWithStorage<Theme>('tenantflow-theme', 'system')
```

### 3. Server State Integration
```typescript
// TanStack Query integration for server state
export const propertiesQueryAtom = atomWithQuery(() => ({
  queryKey: ['properties'],
  queryFn: fetchProperties,
  staleTime: 5 * 60 * 1000, // 5 minutes
}))
```

### 4. Optimistic Updates
```typescript
// Optimistic updates with rollback capability
export const updatePropertyMutationAtom = atomWithMutation((get) => ({
  mutationFn: updateProperty,
  onMutate: async (newProperty) => {
    // Optimistically update local state
    return { previousProperty: getCurrentProperty() }
  },
  onError: (error, variables, context) => {
    // Rollback on error
    if (context?.previousProperty) {
      restoreProperty(context.previousProperty)
    }
  },
}))
```

## Usage Patterns

### Basic Atom Usage
```typescript
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { userAtom } from '@/atoms'

function UserProfile() {
  // Read and write
  const [user, setUser] = useAtom(userAtom)
  
  // Read only
  const user = useAtomValue(userAtom)
  
  // Write only
  const setUser = useSetAtom(userAtom)
  
  return <div>{user?.name}</div>
}
```

### Custom Hooks
```typescript
import { useAuth, useTheme, useProperties } from '@/hooks'

function Dashboard() {
  const { user, isAuthenticated, setUser } = useAuth()
  const { theme, setTheme, toggleSidebar } = useTheme()
  const { properties, addProperty, selectProperty } = useProperties()
  
  // Use the state...
}
```

### Action Atoms
```typescript
// Action atoms for complex operations
export const loginUserAtom = atom(
  null,
  async (get, set, credentials: LoginCredentials) => {
    try {
      set(authLoadingAtom, true)
      const user = await loginAPI(credentials)
      set(userAtom, user)
      set(lastActivityAtom, Date.now())
    } catch (error) {
      set(authErrorAtom, error.message)
    } finally {
      set(authLoadingAtom, false)
    }
  }
)
```

## Performance Benefits over Zustand

### 1. Granular Reactivity
- **Zustand**: All subscribers to a store re-render on any state change
- **Jotai**: Only components using changed atoms re-render

### 2. Bundle Size
- **Zustand**: Entire store loaded even if only using small parts
- **Jotai**: Tree-shakeable atoms, load only what's used

### 3. Type Safety
- **Zustand**: Manual typing of selectors and actions
- **Jotai**: Automatic type inference from atom definitions

### 4. Server State
- **Zustand**: Manual integration with React Query
- **Jotai**: Built-in React Query atoms with `atomWithQuery`

### 5. Persistence
- **Zustand**: Manual middleware configuration
- **Jotai**: Built-in `atomWithStorage` for automatic sync

## Migration from Zustand

### Before (Zustand)
```typescript
const useAppStore = create<AppState & AppActions>((set) => ({
  user: null,
  theme: 'system',
  setUser: (user) => set({ user }),
  setTheme: (theme) => set({ theme }),
}))

// Usage
const { user, setUser, theme, setTheme } = useAppStore()
```

### After (Jotai)
```typescript
export const userAtom = atom<User | null>(null)
export const themeAtom = atomWithStorage<Theme>('theme', 'system')

// Usage
const [user, setUser] = useAtom(userAtom)
const [theme, setTheme] = useAtom(themeAtom)
```

## Best Practices

### 1. Atom Organization
- Group related atoms in the same file
- Use barrel exports for clean imports
- Keep atoms focused and single-purpose

### 2. Derived State
```typescript
// Prefer derived atoms over storing computed values
export const filteredPropertiesAtom = atom((get) => {
  const properties = get(propertiesAtom)
  const filters = get(propertyFiltersAtom)
  return applyFilters(properties, filters)
})
```

### 3. Actions
```typescript
// Use action atoms for complex operations
export const createPropertyAtom = atom(
  null,
  async (get, set, propertyData: CreatePropertyInput) => {
    // Complex creation logic with error handling
  }
)
```

### 4. Server State
```typescript
// Separate client state (atoms) from server state (queries)
const clientProperties = useAtomValue(propertiesAtom) // Client state
const serverProperties = useAtomValue(propertiesQueryAtom) // Server state
```

### 5. Error Handling
```typescript
// Include error states in your atoms
export const propertiesErrorAtom = atom<string | null>(null)

export const fetchPropertiesAtom = atom(
  null,
  async (get, set) => {
    try {
      set(propertiesErrorAtom, null)
      const properties = await fetchProperties()
      set(propertiesAtom, properties)
    } catch (error) {
      set(propertiesErrorAtom, error.message)
    }
  }
)
```

## Testing

### Atom Testing
```typescript
import { createStore } from 'jotai'
import { userAtom } from '@/atoms'

describe('userAtom', () => {
  it('should initialize with null', () => {
    const store = createStore()
    expect(store.get(userAtom)).toBe(null)
  })
  
  it('should update user state', () => {
    const store = createStore()
    const user = { id: '1', name: 'Test User' }
    store.set(userAtom, user)
    expect(store.get(userAtom)).toEqual(user)
  })
})
```

### Component Testing
```typescript
import { render, screen } from '@testing-library/react'
import { Provider } from 'jotai'
import { userAtom } from '@/atoms'
import UserProfile from './UserProfile'

test('displays user name', () => {
  const store = createStore()
  store.set(userAtom, { id: '1', name: 'John Doe' })
  
  render(
    <Provider store={store}>
      <UserProfile />
    </Provider>
  )
  
  expect(screen.getByText('John Doe')).toBeInTheDocument()
})
```

## Next Steps

1. **Server Integration**: Connect atoms to your actual API endpoints
2. **Persistence Strategy**: Configure which atoms should persist across sessions
3. **Real-time Updates**: Add WebSocket integration for live data
4. **Error Boundaries**: Implement error boundaries for server state atoms
5. **DevTools**: Set up Jotai DevTools for debugging in development