# TenantFlow System Patterns

## Architecture Decision Records

### Multi-Tenant Security Architecture
**Decision**: Implement Row-Level Security (RLS) at database level with org_id filtering  
**Rationale**: Ensures complete data isolation without application-level filtering complexity  
**Implementation**: 
- All tables have `org_id` column
- RLS policies: `org_id = auth.jwt() ->> 'org_id'`
- BaseCrudService automatically handles org scoping
- Repository pattern enforces RLS usage

### Frontend Architecture Pattern
**Decision**: Server Components First with React 19  
**Rationale**: Better performance, SEO, reduced client-side JavaScript  
**Implementation**:
- Default to server components for all new features
- Client components only for interactivity (`'use client'` directive)
- Data fetching at server component level
- State management minimal (Zustand + Jotai for client state)

### Backend Service Architecture
**Decision**: BaseCrudService pattern with dependency injection  
**Rationale**: Consistent CRUD operations, proper separation of concerns  
**Implementation**:
```typescript
@Injectable()
export class EntityService extends BaseCrudService<Entity> {
  constructor(
    private readonly entityRepository: EntityRepository,
    private readonly supabaseService: SupabaseService
  ) {
    super(entityRepository, supabaseService)
  }
}
```

### API Design Patterns
**Decision**: RESTful APIs with Zod validation and JWT authentication  
**Rationale**: Industry standards, type safety, security by default  
**Implementation**:
- All endpoints protected with JwtAuthGuard
- Request/response validation with Zod schemas
- Consistent error response format
- OpenAPI documentation generation

## Data Flow Patterns

### Request Flow Architecture
```
Client Request → Next.js Middleware → API Route/Server Action → NestJS Controller → Service → Repository → Supabase → RLS Policy Check → Response
```

### Authentication Flow
```
User Login → Supabase Auth → JWT Token → Client Storage → API Request Headers → JwtAuthGuard → User Context → RLS org_id Filtering
```

### Real-time Updates Pattern
```
Database Change → Supabase Real-time → WebSocket → Frontend Subscription → State Update → UI Refresh
```

## Code Organization Patterns

### Monorepo Structure
```
apps/
├── frontend/          # Next.js 15 + React 19
├── backend/           # NestJS 11 + Fastify
└── storybook/         # Component documentation

packages/
├── shared/            # Types, utilities, validation
├── emails/            # React Email templates
├── database/          # Supabase utilities
└── config/            # Shared configurations
```

### Import Hierarchy Rules
1. External libraries first
2. `@repo/shared` types and utilities
3. Internal modules (relative imports)
4. Never import from sibling app directories

### File Naming Conventions
- **Components**: PascalCase (`PropertyCard.tsx`)
- **Services**: camelCase with suffix (`property.service.ts`)
- **Controllers**: camelCase with suffix (`property.controller.ts`)
- **Types**: PascalCase interfaces (`Property`, `CreatePropertyDto`)
- **Constants**: SCREAMING_SNAKE_CASE

## Error Handling Patterns

### Backend Error Strategy
```typescript
try {
  const result = await this.service.performOperation(data)
  return { success: true, data: result }
} catch (error) {
  if (error instanceof ValidationError) {
    throw new BadRequestException(error.message)
  }
  if (error instanceof NotFoundError) {
    throw new NotFoundException('Resource not found')
  }
  throw new InternalServerErrorException('Operation failed')
}
```

### Frontend Error Boundaries
```typescript
// Server Component Error Handling
export default async function Page() {
  try {
    const data = await fetchData()
    return <Component data={data} />
  } catch (error) {
    return <ErrorFallback error={error} />
  }
}

// Client Component Error Boundary
'use client'
export function ClientComponent() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <InteractiveComponent />
    </ErrorBoundary>
  )
}
```

## State Management Patterns

### Server State (TanStack Query)
```typescript
export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: () => apiClient.get('/properties'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
```

### Client State (Zustand)
```typescript
interface AuthState {
  user: User | null
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}))
```

### Component State (Jotai)
```typescript
// Atoms for component-scoped state
export const selectedPropertyAtom = atom<string | null>(null)
export const propertyFiltersAtom = atom<PropertyFilters>({})
```

## Database Patterns

### RLS Policy Template
```sql
-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Org-scoped access policy
CREATE POLICY "org_access_policy" ON table_name
FOR ALL USING (org_id = auth.jwt() ->> 'org_id');

-- Optional: More specific policies
CREATE POLICY "users_can_read" ON table_name
FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "users_can_modify" ON table_name  
FOR INSERT, UPDATE, DELETE USING (org_id = auth.jwt() ->> 'org_id');
```

### Repository Pattern
```typescript
@Injectable()
export class PropertyRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<Property[]> {
    const { data, error } = await this.supabaseService.client
      .from('properties')
      .select('*') // RLS automatically filters by org_id
    
    if (error) throw new BadRequestException(error.message)
    return data as Property[]
  }
}
```

## Testing Patterns

### React 19 Test Pattern
```typescript
// Server Component Testing
describe('PropertyPage', () => {
  it('renders property data', async () => {
    const mockProperties = [createMockProperty()]
    mockApiClient.get.mockResolvedValue(mockProperties)

    await act(async () => {
      render(await PropertyPage())
    })

    expect(screen.getByText('Test Property')).toBeInTheDocument()
  })
})

// Client Component Testing
describe('PropertyClient', () => {
  it('handles user interaction', async () => {
    render(<PropertyClient properties={mockProperties} />)
    
    await act(async () => {
      fireEvent.click(screen.getByRole('button'))
    })
    
    expect(screen.getByText('Updated')).toBeInTheDocument()
  })
})
```

### Service Testing Pattern
```typescript
describe('PropertyService', () => {
  let service: PropertyService
  let mockRepository: jest.Mocked<PropertyRepository>

  beforeEach(() => {
    mockRepository = createMockRepository()
    service = new PropertyService(mockRepository, mockSupabaseService)
  })

  it('creates property with org_id', async () => {
    const propertyData = createMockPropertyData()
    const result = await service.create(propertyData)
    
    expect(mockRepository.create).toHaveBeenCalledWith({
      ...propertyData,
      org_id: expect.any(String)
    })
  })
})
```

## Performance Patterns

### Caching Strategy
- **Frontend**: TanStack Query with stale-while-revalidate
- **Backend**: Redis caching for frequently accessed data
- **Database**: Proper indexing on org_id and frequently queried columns
- **CDN**: Vercel Edge Network for static assets and API responses

### Bundle Optimization
- **Code Splitting**: Dynamic imports for large components
- **Tree Shaking**: Proper ES modules and dead code elimination
- **Image Optimization**: Next.js Image component with WebP conversion
- **Font Optimization**: Next.js font optimization with preloading

### Database Optimization
- **Indexes**: Composite indexes on (org_id, frequently_queried_column)
- **Connection Pooling**: Supabase managed connection pooling
- **Query Optimization**: Use select() to limit returned columns
- **Batch Operations**: Bulk inserts/updates where possible