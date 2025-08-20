# TenantFlow Supabase Migration Workflow

**Priority: High** - Complete migration from Prisma to Supabase with proper RLS policies

You have access to `npm`, `supabase`, and all TenantFlow commands. Please help migrate remaining Prisma dependencies to Supabase.

<detailed_sequence_of_steps>

# Supabase Migration Process - Detailed Sequence of Steps

## 1. Assess Current Migration State

1. Search for remaining Prisma references:
   ```xml
   <search_files>
   <path>apps</path>
   <regex>prisma|@prisma|PrismaService</regex>
   <file_pattern>*.ts,*.tsx,*.json</file_pattern>
   </search_files>
   ```

2. Check package.json dependencies:
   ```xml
   <read_file>
   <path>apps/backend/package.json</path>
   </read_file>
   ```

3. Identify Prisma-specific files:
   ```bash
   find . -name "*.prisma" -o -name "prisma" -type d
   ```

## 2. Ask User About Migration Scope

1. Present current state and ask for approach:
   ```xml
   <ask_followup_question>
   <question>I've analyzed the current Prisma to Supabase migration state:

   **Found Prisma References:**
   [List of files/locations with Prisma code]

   **Migration Strategy Options:**
   1. **Complete removal**: Remove all Prisma code and replace with Supabase
   2. **Gradual migration**: Migrate one service/module at a time
   3. **Assessment only**: Just identify what needs migration

   **Estimated Scope:**
   - Services to migrate: [count]
   - Database schema to verify: [tables]
   - RLS policies to implement: [policies]

   Which approach would you prefer?</question>
   <options>["Complete removal", "Gradual migration", "Assessment only", "Let me see the analysis first"]</options>
   </ask_followup_question>
   ```

## 3. Backup Current Database Schema

1. Export current Supabase schema:
   ```bash
   npm run update-supabase-types
   ```

2. Document current RLS policies:
   ```bash
   supabase db dump --schema public --data-only=false > backup-schema.sql
   ```

3. Save current types for reference:
   ```bash
   cp packages/shared/src/types/supabase-generated.ts packages/shared/src/types/supabase-backup.ts
   ```

## 4. Migrate Service by Service

1. For each Prisma service, read the current implementation:
   ```xml
   <read_file>
   <path>apps/backend/src/[service]/[service].service.ts</path>
   </read_file>
   ```

2. Check if corresponding Supabase repository exists:
   ```xml
   <read_file>
   <path>apps/backend/src/[service]/[service].repository.ts</path>
   </read_file>
   ```

3. Create Supabase repository if missing:
   ```typescript
   // Create [service].repository.ts
   @Injectable()
   export class [Service]Repository {
     constructor(private readonly supabaseService: SupabaseService) {}

     async findAll(): Promise<[Entity][]> {
       const { data, error } = await this.supabaseService.client
         .from('[table_name]')
         .select('*')
       
       if (error) throw new BadRequestException(error.message)
       return data as [Entity][]
     }

     // Other CRUD operations with RLS
   }
   ```

4. Update service to extend BaseCrudService:
   ```typescript
   @Injectable()
   export class [Service]Service extends BaseCrudService<[Entity]> {
     constructor(
       private readonly [service]Repository: [Service]Repository,
       private readonly supabaseService: SupabaseService
     ) {
       super([service]Repository, supabaseService)
     }
   }
   ```

## 5. Verify RLS Policies

1. Check current RLS policies for each table:
   ```bash
   supabase db dump --schema public | grep -A 5 -B 5 "ROW LEVEL SECURITY"
   ```

2. For each table without RLS, create policy:
   ```sql
   -- Enable RLS
   ALTER TABLE [table_name] ENABLE ROW LEVEL SECURITY;

   -- Create org-scoped policy
   CREATE POLICY "org_access_policy" ON [table_name]
   FOR ALL USING (org_id = auth.jwt() ->> 'org_id');
   ```

3. Test RLS policies:
   ```bash
   # Test script to verify RLS works
   node scripts/test-rls-policies.js
   ```

## 6. Update Frontend Data Fetching

1. Search for Prisma usage in frontend:
   ```xml
   <search_files>
   <path>apps/frontend/src</path>
   <regex>prisma|PrismaClient</regex>
   <file_pattern>*.ts,*.tsx</file_pattern>
   </search_files>
   ```

2. Replace with TanStack Query + API calls:
   ```typescript
   // Replace Prisma queries with API calls
   const { data: properties } = useQuery({
     queryKey: ['properties'],
     queryFn: () => apiClient.get('/properties'),
   })
   ```

## 7. Clean Up Prisma Dependencies

1. Ask user before removing dependencies:
   ```xml
   <ask_followup_question>
   <question>Migration to Supabase repositories is complete! 🎉

   **Migration Summary:**
   - ✅ [count] services migrated to BaseCrudService
   - ✅ [count] repositories use Supabase client
   - ✅ RLS policies verified for all tables
   - ✅ Frontend updated to use API calls

   **Ready to clean up Prisma:**
   - Remove @prisma/client dependency
   - Delete prisma/ directory
   - Remove PrismaService and PrismaModule
   - Update imports across codebase

   Should I proceed with the Prisma cleanup?</question>
   <options>["Yes, remove all Prisma code", "Remove dependencies only", "Let me test first", "Keep Prisma for now"]</options>
   </ask_followup_question>
   ```

2. If approved, remove Prisma dependencies:
   ```bash
   cd apps/backend
   npm uninstall @prisma/client prisma
   ```

3. Remove Prisma files:
   ```bash
   rm -rf apps/backend/prisma/
   rm -f apps/backend/src/prisma/
   ```

4. Remove Prisma imports:
   ```xml
   <search_files>
   <path>apps/backend/src</path>
   <regex>import.*prisma|from.*prisma</regex>
   <file_pattern>*.ts</file_pattern>
   </search_files>
   ```

## 8. Update Module Imports

1. Find and update module imports:
   ```xml
   <read_file>
   <path>apps/backend/src/app.module.ts</path>
   </read_file>
   ```

2. Remove PrismaModule and add SupabaseModule:
   ```typescript
   // Remove: PrismaModule
   // Ensure: SupabaseModule is imported
   @Module({
     imports: [
       ConfigModule.forRoot(),
       SupabaseModule, // ✅ Keep
       // PrismaModule, // ❌ Remove
       // ... other modules
     ],
   })
   export class AppModule {}
   ```

## 9. Validate Migration

1. Run comprehensive tests:
   ```bash
   npm run claude:check
   ```

2. Test API endpoints:
   ```bash
   npm run dev &
   sleep 3
   curl -X GET "http://localhost:3001/properties" \
     -H "Authorization: Bearer [test-token]"
   ```

3. Verify database operations:
   ```bash
   # Test CRUD operations through API
   curl -X POST "http://localhost:3001/properties" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer [test-token]" \
     -d '{"name": "Test Property", "address": "123 Test St"}'
   ```

## 10. Update Documentation

1. Update types after migration:
   ```bash
   npm run update-supabase-types
   ```

2. Rebuild shared package:
   ```bash
   cd packages/shared
   npm run build
   ```

3. Ask about documentation updates:
   ```xml
   <ask_followup_question>
   <question>Supabase migration is complete! 🎉

   **Migration Results:**
   - ✅ All services use BaseCrudService pattern
   - ✅ All database access through Supabase RLS
   - ✅ Prisma dependencies removed
   - ✅ Tests passing
   - ✅ API endpoints functional

   **Final Steps:**
   Would you like me to:
   1. Create a commit documenting the migration
   2. Update CLAUDE.md to reflect Supabase-only architecture
   3. Create a PR for the migration

   What should I do next?</question>
   <options>["Create migration commit", "Update CLAUDE.md", "Create PR", "All of the above", "I'll handle it"]</options>
   </ask_followup_question>
   ```

## 11. Create Migration Commit

1. If requested, commit the migration:
   ```bash
   git add .
   git status
   ```

2. Create comprehensive commit message:
   ```bash
   cat << EOF | git commit -F -
   feat: complete Supabase migration, remove Prisma dependencies

   **Major Changes:**
   - Migrate all services to BaseCrudService pattern
   - Replace Prisma repositories with Supabase repositories  
   - Implement comprehensive RLS policies for all tables
   - Remove @prisma/client and prisma directory
   - Update all imports to use Supabase client

   **Security Improvements:**
   - All database queries now use Row Level Security
   - Automatic org_id filtering through RLS policies
   - Eliminated direct database access bypassing security

   **Architecture Benefits:**
   - Consistent BaseCrudService pattern across all entities
   - Simplified repository layer with Supabase client
   - Better type safety with generated Supabase types
   - Improved multi-tenant security model

   **Testing:**
   - All existing tests updated and passing
   - API endpoints verified functional
   - RLS policies tested for proper isolation

   Closes migration from Prisma to Supabase ✅

   🤖 Generated with [Claude Code](https://claude.ai/code)

   Co-Authored-By: Claude <noreply@anthropic.com>
   EOF
   ```

</detailed_sequence_of_steps>

<migration_patterns>

# Supabase Migration Patterns

## Prisma Service → BaseCrudService Pattern
```typescript
// Before (Prisma)
@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.property.findMany({
      where: { orgId: getCurrentOrgId() }
    })
  }
}

// After (Supabase)
@Injectable()
export class PropertyService extends BaseCrudService<Property> {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly supabaseService: SupabaseService
  ) {
    super(propertyRepository, supabaseService)
  }
  // RLS automatically handles org filtering
}
```

## Repository Pattern Implementation
```typescript
@Injectable()
export class PropertyRepository {
  constructor(private readonly supabaseService: SupabaseService) {}

  async findAll(): Promise<Property[]> {
    const { data, error } = await this.supabaseService.client
      .from('properties')
      .select('*')
    
    if (error) throw new BadRequestException(error.message)
    return data as Property[]
  }

  async create(property: CreatePropertyDto): Promise<Property> {
    const { data, error } = await this.supabaseService.client
      .from('properties')
      .insert(property)
      .select()
      .single()
    
    if (error) throw new BadRequestException(error.message)
    return data as Property
  }
}
```

## RLS Policy Template
```sql
-- Enable RLS on table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create organization-scoped policy
CREATE POLICY "org_access_policy" ON properties
FOR ALL USING (org_id = auth.jwt() ->> 'org_id');

-- Optional: Create more specific policies
CREATE POLICY "users_can_read_org_properties" ON properties
FOR SELECT USING (org_id = auth.jwt() ->> 'org_id');

CREATE POLICY "users_can_modify_org_properties" ON properties
FOR INSERT, UPDATE, DELETE USING (org_id = auth.jwt() ->> 'org_id');
```

</migration_patterns>

<validation_commands>

# Migration Validation Commands

```bash
# Check for remaining Prisma references
rg -i "prisma" --type ts --type js apps/

# Verify Supabase types are current
npm run update-supabase-types

# Test RLS policies
node scripts/test-rls-policies.js

# Run full test suite
npm run claude:check

# Test API endpoints
curl -X GET "http://localhost:3001/properties" \
  -H "Authorization: Bearer [token]"

# Check database schema
supabase db dump --schema public

# Verify build succeeds
npm run build
```

</validation_commands>