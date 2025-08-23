# Frontend Architecture Guidelines

## 🎯 Core Principles

This document establishes patterns to prevent over-engineering and maintain the simplified architecture achieved through our refactoring effort.

### DRY, KISS, No-Abstractions
- **DRY**: Only centralize code reused ≥2 places
- **KISS**: Choose the simplest working path with native library usage
- **No New Abstractions**: Do not introduce factories, wrappers, or meta-layers

## 📚 Library Usage Patterns

### React Query (TanStack Query)
✅ **CORRECT - Direct Usage**
```typescript
export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: () => apiClient.getProperties(),
    staleTime: 5 * 60 * 1000
  })
}

export function useCreateProperty() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: CreatePropertyInput) => apiClient.createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      toast.success('Property created successfully')
    },
    onError: () => {
      toast.error('Failed to create property')
    }
  })
}
```

❌ **INCORRECT - Factory Pattern**
```typescript
// Don't create query factories
export function useQueryFactory<T>(config: QueryConfig<T>) { ... }
export function useMutationFactory<T>(config: MutationConfig<T>) { ... }
```

### React Hook Form
✅ **CORRECT - Direct Usage**
```typescript
export function PropertyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<PropertyFormData>()
  
  const onSubmit = (data: PropertyFormData) => {
    // Handle submission
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input 
        {...register('name', { required: 'Name is required' })}
        placeholder="Property name"
      />
      {errors.name && <span>{errors.name.message}</span>}
    </form>
  )
}
```

❌ **INCORRECT - Form Abstractions**
```typescript
// Don't create form factories or pattern abstractions
export function FormFactory({ schema, onSubmit, children }) { ... }
export function useFormPattern(config: FormConfig) { ... }
```

### Jotai State Management
✅ **CORRECT - Direct Primitives**
```typescript
// In component
import { useAtomValue, useSetAtom } from 'jotai'
import { userAtom, notificationsAtom } from '@/atoms'

function Header() {
  const user = useAtomValue(userAtom)
  const setNotifications = useSetAtom(notificationsAtom)
  // ...
}
```

❌ **INCORRECT - Wrapper Hooks**
```typescript
// Don't create thin wrappers
export const useUser = () => useAtomValue(userAtom)
export const useSetNotifications = () => useSetAtom(notificationsAtom)
```

✅ **ACCEPTABLE - Business Logic Hooks**
```typescript
// Complex hooks that aggregate multiple atoms + logic are OK
export function useAuth() {
  const user = useAtomValue(userAtom)
  const isAuthenticated = useAtomValue(isAuthenticatedAtom)
  const setUser = useSetAtom(userAtom)
  const clearAuth = useSetAtom(clearAuthAtom)
  
  const login = useCallback(async (credentials: LoginData) => {
    // Complex authentication logic
    const result = await authService.login(credentials)
    setUser(result.user)
    return result
  }, [setUser])

  return { user, isAuthenticated, login, clearAuth }
}
```

## 🔧 API Client Patterns

### Single Response Pattern
✅ **CORRECT - Unified Error Handling**
```typescript
class ApiClient {
  async post<T>(url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.post(url, data)
      return response.data
    } catch (error) {
      throw new ApiError({
        message: error.response?.data?.message || 'Request failed',
        code: error.response?.status,
        details: error.response?.data
      })
    }
  }
}

// Usage with standard try/catch
try {
  const result = await apiClient.post<Property>('/properties', data)
  return result
} catch (error) {
  console.error('Failed to create property:', error.message)
  throw error
}
```

❌ **INCORRECT - Dual Response Patterns**
```typescript
// Don't create multiple response shapes
async postFull<T>(): Promise<ApiResponse<T> | ErrorResponse> { ... }
async post<T>(): Promise<T> { ... }
```

## 📋 Component Organization

### File Structure
```
components/
├── ui/              # Shadcn/ui primitives
├── forms/           # Domain-specific forms (PropertyForm, TenantForm)
├── billing/         # Billing-related components
├── properties/      # Property-related components
└── modals/          # Reusable modal components
```

### Component Patterns
✅ **CORRECT - Single Responsibility**
```typescript
// PropertyForm.tsx - handles property creation/editing
export function PropertyForm({ initialData, onSubmit }: PropertyFormProps) {
  const { register, handleSubmit } = useForm<PropertyFormData>()
  // Form logic here
}

// PropertyList.tsx - displays list of properties
export function PropertyList() {
  const { data: properties } = useProperties()
  // List rendering here
}
```

❌ **INCORRECT - Generic Factories**
```typescript
// Don't create generic component factories
export function FormFactory<T>({ schema, entity }: FormFactoryProps<T>) { ... }
export function ListFactory<T>({ items, renderItem }: ListFactoryProps<T>) { ... }
```

## 🚫 Anti-Patterns to Avoid

### 1. Thin Wrapper Hooks
```typescript
❌ export const useUser = () => useAtomValue(userAtom)
❌ export const useProperties = () => useQuery(['properties'], fetchProperties)
```

### 2. Factory Patterns
```typescript
❌ export function createQueryHook<T>(key: string, fetcher: () => Promise<T>) { ... }
❌ export function createFormComponent<T>(schema: Schema<T>) { ... }
```

### 3. Over-Abstracted Components
```typescript
❌ export function GenericDataTable<T>({ 
  data, 
  columns, 
  filters, 
  sorting, 
  pagination,
  // ... 20 more props
}) { ... }
```

### 4. Configuration-Driven Components
```typescript
❌ export function FormBuilder({ 
  schema: FormSchema, 
  validation: ValidationRules,
  layout: LayoutConfig 
}) { ... }
```

## ✅ When Abstractions Are Acceptable

### 1. Genuine Reuse (≥2 Places)
```typescript
✅ // Used in multiple forms across the app
export function FormField({ label, error, children }: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      {children}
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  )
}
```

### 2. Complex Business Logic
```typescript
✅ // Aggregates multiple data sources and provides business logic
export function useSubscription() {
  const subscription = useAtomValue(subscriptionAtom)
  const usage = useAtomValue(usageAtom)
  const user = useAtomValue(userAtom)
  
  // Complex derived state
  const canAccessPremiumFeatures = useMemo(() => {
    return subscription?.status === 'active' && 
           subscription?.plan !== 'FREETRIAL'
  }, [subscription])
  
  return { subscription, usage, canAccessPremiumFeatures, ... }
}
```

### 3. Cross-Cutting Concerns
```typescript
✅ // Error boundary, analytics, authentication guards
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated } = useAuth()
    
    if (!isAuthenticated) {
      return <LoginForm />
    }
    
    return <Component {...props} />
  }
}
```

### 4. Complex Domain-Specific Components
```typescript
✅ // Auth forms with complex validation, OAuth, error handling
export function AuthFormFactory({ config, onSuccess }: AuthFormFactoryProps) {
  // Complex authentication logic including:
  // - Multi-step validation
  // - OAuth integration
  // - Error handling
  // - Loading states
  // - Form transitions
  // - Accessibility compliance
  
  // 1000+ lines acceptable when:
  // - Used in multiple places (login, signup, forgot password)
  // - Contains significant business logic
  // - Provides consistent UX for critical flows
  // - High cost to split without clear benefit
}
```

## 🔍 Code Review Checklist

Before merging any PR, verify:

- [ ] No new factory patterns introduced
- [ ] No thin wrapper hooks around library primitives
- [ ] Direct usage of React Query, React Hook Form, Jotai
- [ ] Shared components have genuine reuse (≥2 places)
- [ ] Complex abstractions have clear business justification
- [ ] ESLint rules pass without new abstraction warnings

## 🎯 Success Metrics

- **Bundle Size**: No significant increase from abstractions
- **Development Speed**: Faster feature development with direct patterns
- **Maintenance**: Easier debugging without abstraction layers
- **Onboarding**: New developers can understand patterns quickly

---

*Last updated: 2025-01-21*
*This document should be updated when architecture decisions change*