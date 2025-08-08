# Service Layer Architecture

This document outlines the service layer implementation for TenantFlow's frontend, providing clean separation of concerns and framework-agnostic business logic.

## Architecture Overview

```
┌─────────────────────┐
│   React Components  │ ← Presentation Layer
├─────────────────────┤
│   Service Hooks     │ ← Application Interface
├─────────────────────┤
│   Domain Services   │ ← Business Logic
├─────────────────────┤
│   Repository Layer  │ ← Data Access
├─────────────────────┤
│   API Client        │ ← Infrastructure
└─────────────────────┘
```

## Key Benefits

✅ **Clean Separation of Concerns**: Business logic is separated from UI components  
✅ **Framework Agnostic**: Services don't depend on React or Next.js  
✅ **Testable**: Services can be unit tested without UI dependencies  
✅ **Type Safe**: End-to-end TypeScript with shared domain models  
✅ **Consistent Error Handling**: Centralized error management  
✅ **Business Rule Enforcement**: Domain validation in a single location  

## Layer Breakdown

### 1. Domain Services (`/services/`)

**Purpose**: Contains pure business logic and domain rules  
**Responsibilities**:
- Domain validation and business rules
- Entity lifecycle management
- Cross-entity business operations
- Framework-agnostic logic

**Examples**:
- `AuthenticationService` - Authentication flows, password validation
- `PropertyManagementService` - Property CRUD, business rules, file uploads
- `TenantManagementService` - Tenant lifecycle, lease relationships

### 2. Repository Layer (`/repositories/`)

**Purpose**: Abstracts data access behind clean interfaces  
**Responsibilities**:
- API communication abstraction
- Data transformation
- Infrastructure concerns isolation
- Caching strategy implementation

**Structure**:
```
repositories/
├── interfaces.ts          ← Repository contracts
├── implementations/
│   ├── auth.repository.ts ← Supabase Auth implementation
│   └── property.repository.ts ← API client implementation
```

### 3. Service Hooks (`/hooks/use-*-service.ts`)

**Purpose**: React integration layer for services  
**Responsibilities**:
- React state management
- Loading and error states
- Toast notifications
- Navigation side effects

### 4. Service Container (`service-container.ts`)

**Purpose**: Dependency injection and service lifecycle management  
**Responsibilities**:
- Service instantiation
- Dependency wiring
- Singleton management
- Testing support

## Usage Patterns

### Basic Service Usage

```typescript
// In a React component
import { useAuth } from '@/hooks/use-auth-service'

function LoginForm() {
  const { signIn, isLoading, error } = useAuth()
  
  const handleSubmit = async (credentials) => {
    const result = await signIn(credentials)
    if (result.success) {
      // Handle success - navigation is handled by the hook
    }
    // Error handling is automatic (toasts, state updates)
  }
}
```

### Direct Service Usage

```typescript
// For server actions or complex logic
import { services } from '@/services'

export async function serverAction(formData: FormData) {
  const result = await services.authService.signIn({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })
  
  if (result.success) {
    redirect('/dashboard')
  } else {
    return { error: result.error.message }
  }
}
```

### Service Testing

```typescript
// Mock services for testing
import { ServiceContainerFactory } from '@/services'

const mockAuthService = {
  signIn: jest.fn(),
  signUp: jest.fn(),
  // ... other methods
}

const mockContainer = ServiceContainerFactory.createMockContainer({
  authService: mockAuthService,
})

ServiceContainerFactory.setContainer(mockContainer)
```

## Service Implementation Guide

### 1. Creating a New Service

```typescript
// 1. Define the service interface
export interface LeaseManagementService {
  createLease(input: CreateLeaseInput): Promise<Result<Lease>>
  validateLeaseTerms(terms: LeaseTerms): Result<void>
}

// 2. Implement the service
export class DefaultLeaseManagementService implements LeaseManagementService {
  constructor(
    private readonly leaseRepository: LeaseRepository,
    private readonly tenantRepository: TenantRepository
  ) {}

  async createLease(input: CreateLeaseInput): Promise<Result<Lease>> {
    // 1. Validate input
    const validation = this.validateLeaseTerms(input.terms)
    if (!validation.success) return validation

    // 2. Apply business rules
    const businessCheck = await this.checkBusinessRules(input)
    if (!businessCheck.success) return businessCheck

    // 3. Create entity
    return this.leaseRepository.create(input)
  }

  validateLeaseTerms(terms: LeaseTerms): Result<void> {
    // Domain validation logic
    if (terms.duration < 1) {
      return Result.failure(new ValidationError('Lease duration must be at least 1 month'))
    }
    return Result.success(undefined)
  }
}
```

### 2. Adding to Service Container

```typescript
// In service-container.ts
public get leaseService(): LeaseManagementService {
  if (!this._leaseService) {
    this._leaseService = new DefaultLeaseManagementService(
      this.leaseRepository,
      this.tenantRepository
    )
  }
  return this._leaseService
}
```

### 3. Creating Service Hook

```typescript
// hooks/use-lease-service.ts
export function useLeases() {
  const leaseService = useLeaseService()
  const [state, setState] = useState({ leases: [], isLoading: false })

  const createLease = useCallback(async (input: CreateLeaseInput) => {
    setState(prev => ({ ...prev, isLoading: true }))
    
    const result = await leaseService.createLease(input)
    
    if (result.success) {
      setState(prev => ({
        leases: [result.value, ...prev.leases],
        isLoading: false
      }))
      toast.success('Lease created successfully!')
    } else {
      toast.error(result.error.message)
      setState(prev => ({ ...prev, isLoading: false }))
    }
    
    return result
  }, [leaseService])

  return { ...state, createLease }
}
```

## Business Rules Implementation

### Domain Validation

Services enforce business rules consistently:

```typescript
// Property service validates business constraints
const businessRules = {
  maxUnitsPerProperty: 500,
  minRentAmount: 0,
  allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
}

validatePropertyData(input: CreatePropertyInput): Result<void> {
  if (input.totalUnits > this.businessRules.maxUnitsPerProperty) {
    return Result.failure(new ValidationError(
      `Cannot exceed ${this.businessRules.maxUnitsPerProperty} units per property`
    ))
  }
  return Result.success(undefined)
}
```

### Cross-Entity Rules

```typescript
// Tenant service checks lease relationships before deletion
async canDeleteTenant(tenantId: string): Promise<Result<boolean>> {
  const leases = await this.leaseRepository.findByTenant(tenantId)
  const activeLeases = leases.filter(lease => lease.status === 'active')
  
  return Result.success(activeLeases.length === 0)
}
```

## Error Handling Strategy

### Result Pattern

All service methods return `Result<T>` for consistent error handling:

```typescript
// Success case
return { success: true, value: user }

// Error case
return { success: false, error: new ValidationError('Invalid email') }
```

### Error Types

Services use domain-specific error types:

```typescript
import { ValidationError, DomainError, NotFoundError } from '@repo/shared'

// Input validation errors
return Result.failure(new ValidationError('Email is required'))

// Business rule violations
return Result.failure(new DomainError('Cannot delete property with active leases'))

// Resource not found
return Result.failure(new NotFoundError('Property', id))
```

## Testing Strategy

### Unit Testing Services

```typescript
describe('AuthenticationService', () => {
  let authService: AuthenticationService
  let mockAuthRepository: jest.Mocked<AuthRepository>

  beforeEach(() => {
    mockAuthRepository = {
      signIn: jest.fn(),
      signUp: jest.fn(),
    }
    authService = new DefaultAuthenticationService(mockAuthRepository)
  })

  it('should validate email format', async () => {
    const result = await authService.signIn({
      email: 'invalid-email',
      password: 'password123'
    })

    expect(result.success).toBe(false)
    expect(result.error.message).toContain('valid email')
    expect(mockAuthRepository.signIn).not.toHaveBeenCalled()
  })
})
```

### Integration Testing

```typescript
describe('Property Management Flow', () => {
  let container: ServiceContainer

  beforeEach(() => {
    container = ServiceContainerFactory.createMockContainer()
  })

  it('should create property with validation', async () => {
    const result = await container.propertyService.createProperty({
      name: 'Test Property',
      address: { street: '123 Main St', city: 'Test City', state: 'TS', zipCode: '12345' }
    }, 'owner-id')

    expect(result.success).toBe(true)
  })
})
```

## Migration Path

To migrate existing components to use the service layer:

### Before (Direct API Usage)
```typescript
function PropertyForm() {
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (data) => {
    setIsLoading(true)
    try {
      const response = await apiClient.post('/properties', data)
      toast.success('Property created!')
      router.push('/properties')
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsLoading(false)
    }
  }
}
```

### After (Service Layer)
```typescript
function PropertyForm() {
  const { createProperty, isLoading } = useProperties()
  
  const handleSubmit = async (data) => {
    const result = await createProperty(data, ownerId)
    if (result.success) {
      router.push('/properties')
    }
    // Error handling and navigation handled by service hook
  }
}
```

## Best Practices

1. **Keep Services Framework-Agnostic**: Don't import React or Next.js in services
2. **Use Result Pattern**: Always return Result<T> for consistent error handling
3. **Validate Early**: Perform validation before calling repositories
4. **Single Responsibility**: Each service handles one domain area
5. **Dependency Injection**: Use constructor injection for dependencies
6. **Business Rules**: Centralize business logic in services, not components
7. **Error Context**: Provide meaningful error messages with context

## Current Implementation Status

✅ **Completed**:
- Service layer architecture
- Authentication service
- Property management service
- Tenant management service (partial)
- Service container with DI
- Repository interfaces
- Service hooks foundation

🚧 **In Progress**:
- Tenant repository implementation
- Lease management service
- Maintenance service
- File upload service

📋 **Planned**:
- Billing service
- Notification service
- Activity logging service
- Reporting service

## Integration with Existing Codebase

The service layer is designed to work alongside your existing patterns:

- **Coexists** with existing API hooks during migration
- **Enhances** existing server actions with business logic
- **Replaces** direct API calls in components gradually
- **Maintains** compatibility with existing error handling

Start by using services in new components and gradually refactor existing ones as needed.