# TenantFlow Feature Development Workflow

You have access to `git`, `npm`, `gh`, and all TenantFlow commands. Please guide me through developing a new feature following TenantFlow patterns.

<detailed_sequence_of_steps>

# Feature Development Process - Detailed Sequence of Steps

## 1. Gather Feature Requirements

1. Ask user for feature details:
   ```xml
   <ask_followup_question>
   <question>Let's develop a new feature for TenantFlow! I need to understand what you want to build.

   Please provide:
   1. Feature name and description
   2. Which part of the app (frontend, backend, or both)
   3. Any specific requirements or constraints
   4. Whether this affects database schema

   What feature would you like to implement?</question>
   <options>["Frontend component/page", "Backend API endpoint", "Full-stack feature", "Database schema change", "Let me describe it in detail"]</options>
   </ask_followup_question>
   ```

## 2. Check Existing Patterns

1. Search for similar features to follow patterns:
   ```xml
   <search_files>
   <path>apps</path>
   <regex>[feature-related-keyword]</regex>
   <file_pattern>*.ts,*.tsx</file_pattern>
   </search_files>
   ```

2. Read existing similar components/services:
   ```xml
   <read_file>
   <path>[path-to-similar-feature]</path>
   </read_file>
   ```

3. Check shared types for relevant interfaces:
   ```xml
   <read_file>
   <path>packages/shared/src/types/[relevant-type].ts</path>
   </read_file>
   ```

## 3. Create Feature Branch

1. Start from main branch:
   ```bash
   git checkout main
   git pull origin main
   ```

2. Create feature branch:
   ```bash
   git checkout -b feature/[feature-name]
   ```

3. Verify we're on the right branch:
   ```bash
   git branch --show-current
   ```

## 4. Plan Implementation Approach

1. Present implementation plan to user:
   ```xml
   <ask_followup_question>
   <question>Based on existing patterns, here's my implementation plan:

   **Backend Changes (if needed):**
   - Create [Entity]Service extending BaseCrudService
   - Add [Entity]Controller with proper validation
   - Create [Entity]Repository with RLS policies
   - Add to [Entity]Module

   **Frontend Changes (if needed):**
   - Create [Component] following server-component-first pattern
   - Add custom hooks for data fetching
   - Update types in packages/shared
   - Add proper error handling

   **Database Changes (if needed):**
   - Create migration for new tables/columns
   - Add RLS policies with org_id filtering
   - Update Supabase types

   Does this approach look correct for your feature?</question>
   <options>["Yes, proceed with this plan", "Modify the approach", "Start with backend first", "Start with frontend first"]</options>
   </ask_followup_question>
   ```

## 5. Implement Backend Changes (if needed)

1. Create service extending BaseCrudService:
   ```typescript
   // Create src/[entity]/[entity].service.ts
   @Injectable()
   export class [Entity]Service extends BaseCrudService<[Entity]> {
     constructor(
       private readonly [entity]Repository: [Entity]Repository,
       private readonly supabaseService: SupabaseService
     ) {
       super([entity]Repository, supabaseService)
     }
   }
   ```

2. Create controller with proper validation:
   ```typescript
   // Create src/[entity]/[entity].controller.ts
   @Controller('[entity]')
   @UseGuards(JwtAuthGuard)
   export class [Entity]Controller {
     // CRUD endpoints with Zod validation
   }
   ```

3. Add RLS-compliant repository:
   ```typescript
   // Create src/[entity]/[entity].repository.ts
   @Injectable()
   export class [Entity]Repository {
     // All queries auto-filter by org_id via RLS
   }
   ```

4. Test backend implementation:
   ```bash
   cd apps/backend
   npm run test:unit -- --testNamePattern="[Entity]"
   ```

## 6. Implement Frontend Changes (if needed)

1. Create server component first:
   ```typescript
   // Create src/app/[route]/page.tsx
   export default async function [Entity]Page() {
     // Server component logic
     const data = await fetch[Entity]Data()
     return <[Entity]Client data={data} />
   }
   ```

2. Create minimal client component:
   ```typescript
   // Create src/components/[entity]/[entity]-client.tsx
   'use client'
   export function [Entity]Client({ data }: Props) {
     // Minimal client-side logic
   }
   ```

3. Add custom hooks for data operations:
   ```typescript
   // Create src/hooks/use-[entity].ts
   export function use[Entity]() {
     // TanStack Query hooks for CRUD operations
   }
   ```

4. Test frontend implementation:
   ```bash
   cd apps/frontend
   npm run test:unit -- --testNamePattern="[Entity]"
   ```

## 7. Update Shared Types

1. Add new types to shared package:
   ```xml
   <read_file>
   <path>packages/shared/src/types/index.ts</path>
   </read_file>
   ```

2. Create or update type definitions:
   ```typescript
   // Add to packages/shared/src/types/[entity].ts
   export interface [Entity] {
     id: string
     org_id: string  // Required for RLS
     // ... other fields
   }
   ```

3. Build shared package:
   ```bash
   cd packages/shared
   npm run build
   ```

## 8. Validate Implementation

1. Run comprehensive tests:
   ```bash
   npm run claude:check
   ```

2. Test the feature manually:
   ```bash
   npm run dev
   ```

3. Check API endpoints (if backend changes):
   ```bash
   curl -X GET "http://localhost:3001/[entity]" \
     -H "Authorization: Bearer [test-token]"
   ```

## 9. Ask User for Feature Testing

1. Request user validation:
   ```xml
   <ask_followup_question>
   <question>Feature implementation is complete! 🎉

   **What's been implemented:**
   - [List of changes made]
   - All tests passing ✅
   - TypeScript compilation successful ✅
   - Follows TenantFlow patterns ✅

   **Next steps:**
   1. Test the feature manually at http://localhost:3000/[route]
   2. Verify functionality works as expected
   3. Check edge cases and error handling

   Would you like me to:
   1. Create a PR for this feature
   2. Make additional changes
   3. Add more tests
   4. Update documentation</question>
   <options>["Create PR", "Make changes", "Add more tests", "Update docs", "I'll test it first"]</options>
   </ask_followup_question>
   ```

## 10. Create Pull Request (if requested)

1. Commit all changes:
   ```bash
   git add .
   git status
   ```

2. Create comprehensive commit:
   ```bash
   cat << EOF | git commit -F -
   feat: implement [feature-name]

   - Add [Entity]Service extending BaseCrudService
   - Create [Entity]Controller with Zod validation
   - Implement [Entity]Repository with RLS policies
   - Add server-first frontend components
   - Update shared types and validation schemas
   - Include comprehensive test coverage

   Follows TenantFlow multi-tenant architecture patterns

   🤖 Generated with [Claude Code](https://claude.ai/code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   ```

3. Push feature branch:
   ```bash
   git push -u origin feature/[feature-name]
   ```

4. Create pull request:
   ```bash
   cat << EOF | gh pr create --title "feat: implement [feature-name]" --body-file -
   ## Summary
   Implements [feature-name] following TenantFlow architecture patterns.

   ## Changes
   - ✅ Backend: [Entity]Service, Controller, Repository with RLS
   - ✅ Frontend: Server-first components with minimal client-side JS
   - ✅ Types: Updated shared types and validation schemas
   - ✅ Tests: Comprehensive unit test coverage
   - ✅ Security: Multi-tenant RLS policies with org_id filtering

   ## Testing
   - All existing tests pass
   - New feature tests included
   - Manual testing completed

   ## Follows TenantFlow Standards
   - ✅ Server components first
   - ✅ BaseCrudService pattern
   - ✅ Multi-tenant RLS security
   - ✅ Shared type system
   - ✅ Proper error handling

   🤖 Generated with [Claude Code](https://claude.ai/code)
   EOF
   ```

5. Display PR URL:
   ```bash
   gh pr view --web
   ```

</detailed_sequence_of_steps>

<implementation_patterns>

# TenantFlow Implementation Patterns

## Backend Service Pattern
```typescript
@Injectable()
export class PropertyService extends BaseCrudService<Property> {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly supabaseService: SupabaseService
  ) {
    super(propertyRepository, supabaseService)
  }

  // Additional business logic methods
  async getPropertiesByLocation(location: string): Promise<Property[]> {
    return this.propertyRepository.findByLocation(location)
  }
}
```

## Frontend Server Component Pattern
```typescript
// page.tsx (Server Component)
export default async function PropertiesPage() {
  const properties = await fetchProperties()
  return (
    <div>
      <PropertiesHeader />
      <PropertiesClient properties={properties} />
    </div>
  )
}

// PropertiesClient.tsx (Client Component)
'use client'
export function PropertiesClient({ properties }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  
  return (
    <div>
      {properties.map(property => (
        <PropertyCard
          key={property.id}
          property={property}
          onSelect={setSelected}
        />
      ))}
    </div>
  )
}
```

## RLS Repository Pattern
```typescript
@Injectable()
export class PropertyRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<Property[]> {
    // RLS automatically filters by org_id
    const { data, error } = await this.supabaseService.client
      .from('properties')
      .select('*')
    
    if (error) throw new BadRequestException(error.message)
    return data
  }
}
```

</implementation_patterns>

<validation_commands>

# Validation Commands

```bash
# Full validation suite
npm run claude:check

# Test specific feature
npm run test:unit -- --testNamePattern="[FeatureName]"

# Check TypeScript across monorepo
npm run typecheck

# Validate API endpoints
curl -X GET "http://localhost:3001/api/[endpoint]" \
  -H "Authorization: Bearer [token]" \
  -H "Content-Type: application/json"

# Check frontend builds
npm run build

# Verify database types are current
npm run update-supabase-types
```

</validation_commands>