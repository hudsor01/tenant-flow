# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TenantFlow is a comprehensive property management system for single-family residential properties. It enables property owners to manage properties, track tenants, handle leases, and provides tenants with read-only access to their lease information.

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (port 5173)
npm run dev

# Build for production (includes type checking via vite build)
npm run build

# Type checking only (uses tsconfig.app.json)
npm run tsc

# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Preview production build
npm run preview

# Database type generation and watching
npm run db:types            # Manually regenerate TypeScript types from database
npm run db:watch            # Watch database schema and auto-regenerate types
npm run dev:full            # Run both database watcher and dev server concurrently
npm run db:migrate          # Apply property type migration

# Test Commands
npm run test                # Run all Playwright E2E tests
npm run test:headed         # Run E2E tests with browser visible
npm run test:ui             # Run E2E tests with UI mode
npm run test:unit           # Run unit tests with Vitest
npm run test:unit:watch     # Run unit tests in watch mode
npm run test:unit:ui        # Run unit tests with UI mode
npm run test:integration    # Run integration tests only
npm run test:edge-function  # Test edge functions locally
npm run test:all            # Run all tests (unit + E2E)

# React Email development server (for testing email templates)
npm run email               # Start email preview server
npm run email-server        # Start email send server
npm run dev:email           # Run both email server and dev server

# Supabase local development
npm run db:start            # Start local Supabase services
npm run db:stop             # Stop local Supabase services  
npm run db:reset            # Reset local database to schema

# Stripe setup and deployment
npm run setup:stripe        # Set up Stripe environment
npm run deploy:functions    # Deploy all Stripe-related Edge Functions
npm run deploy:migration    # Push database migrations to production
```

## Database Status: ✅ FULLY CONFIGURED

**✅ COMPLETED**: Database has been fully set up and all issues resolved:

1. **✅ Schema Applied**: Database schema matches application requirements exactly
2. **✅ RLS Policies**: Row-level security implemented with owner-based access control
3. **✅ Auth Trigger**: Automatic User profile creation on signup configured
4. **✅ Type Generation**: Automated TypeScript type generation from live database schema
5. **✅ Error Resolution**: Fixed 403 forbidden errors and 500 internal server errors

**Current Status**: All database operations are working correctly.

### Hybrid Type Generation System

The application uses a hybrid approach for TypeScript types:
- **Custom psql Script**: Connects directly to Supabase cloud database (bypasses CLI auth issues)
- **Proper Enums**: Generates TypeScript types with actual enum unions instead of `unknown`
- **Auto-Generated**: Runs automatically on `npm install` via `postinstall` script
- **Manual Trigger**: Use `npm run db:types` to regenerate types manually
- **Relationship Types**: Manual TypeScript interfaces for complex query patterns
- **⚠️ Security Note**: Connection string is hardcoded in `scripts/generate-types-psql.cjs`
- **Schema Sync**: Types stay synchronized with live database schema changes

## Architecture Overview

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Routing**: React Router DOM v7 (traditional client-side routing)
- **UI Components**: shadcn/ui (40+ components) + Tailwind CSS v4
- **State Management**: Zustand
- **Data Fetching**: TanStack Query (React Query) with direct Supabase client calls
- **Form Handling**: React Hook Form + Zod validation
- **Database**: Supabase (PostgreSQL + Auth + Storage + Real-time)
- **Type Generation**: Custom psql-based TypeScript type generation
- **Email**: React Email + Resend
- **Testing**: Playwright (E2E) + Vitest (Unit/Integration)
- **Payment Processing**: Stripe (via Edge Functions)

### Security Model: Owner-Based Row Level Security (RLS)

The application uses **owner-based security** where users can only access data they directly own:
- No `tenant_id` fields - security is based on direct ownership relationships
- Properties are owned by users via `ownerId`
- Tenants are accessible through the property ownership chain
- All database queries are automatically filtered by ownership
- Storage buckets follow pattern: `user-{id}/*`

### Authentication Flow

1. User signs in via Supabase Auth (email/password or Google OAuth)
2. Auth trigger automatically creates User profile in database
3. Session stored in Zustand store with exponential backoff for profile lookup
4. Protected routes check auth state before rendering
5. All API requests include user context from JWT

### Routing Architecture

The application uses React Router DOM with traditional client-side routing and lazy loading:
- **Public Routes**: `/auth/*` (login, signup, forgot-password, callback, test)
- **Tenant Portal**: `/tenant/*` (invitation acceptance, tenant dashboard, payments)
- **Owner Dashboard**: All other routes require authentication (`/dashboard`, `/properties`, `/tenants`, etc.)
- **Protected Routes**: Wrapped with `<ProtectedRoute>` component that checks auth state
- **Layouts**: 
  - Main app routes use `<Layout>` component for owner/manager interface
  - Tenant routes use `<TenantLayout>` component for tenant-specific interface
- **Code Splitting**: Most components are lazy-loaded with React.lazy() for performance
- **Routing Setup**: BrowserRouter wraps the entire app in main.tsx

### Data Flow Architecture

```
Frontend (React + Vite)
    ├── Custom Hooks (TanStack Query) → Direct Supabase client calls
    ├── Zustand Store → Global state management
    └── React Hook Form + Zod → Form validation
          ↓
Backend (Supabase)
    ├── PostgreSQL with RLS → Data persistence & security
    ├── Auth → User authentication & JWT
    ├── Real-time → Live updates (planned)
    └── Storage → File uploads
          ↓
External Services
    ├── Resend → Email delivery (via Edge Functions)
    └── Stripe → Payment processing (planned)
```

### Email System Architecture

The application uses React Email for professional email templates:
- Templates defined as React components in `emails/` folder (following React Email standards)
- Server-side rendering via Supabase Edge Functions
- Sent via Resend API through Supabase Edge Functions
- Current templates: TenantInvitationEmail (emails/tenant-invitation.tsx)

### Database Models (Key Relationships)

```
User (Property Owners/Managers)
  ├── Properties (1:many)
  │     ├── Units (1:many)
  │     │     └── Leases (1:many)
  │     └── Documents (1:many)
  ├── Tenant (1:1 optional - when user is also a tenant)
  └── Notifications (1:many)

Tenant (Tenant Information)
  ├── Leases (1:many)
  ├── Payments (1:many)
  └── MaintenanceRequests (1:many through unit)
```

## Key Implementation Patterns

### Data Fetching Pattern (Custom Hooks + TanStack Query)
```typescript
// All data fetching uses custom hooks with direct Supabase client calls
export function useProperties() {
  const { user } = useAuthStore()

  return useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      // Complex relational queries with RLS protection
      const { data, error } = await supabase
        .from('Property')
        .select(`
          *,
          units:Unit (
            id, unitNumber, bedrooms, bathrooms,
            leases:Lease (
              id, startDate, endDate, status,
              tenant:Tenant (id, name, email)
            )
          )
        `)
        .eq('ownerId', user.id)

      if (error) throw error
      return data as PropertyWithUnits[]
    },
    enabled: !!user?.id,
  })
}
```

### Error Handling Pattern (Supabase + TanStack Query)
```typescript
// Error handling in custom hooks with TanStack Query
export function useProperties() {
  return useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('Property')
        .select('*')
        .eq('ownerId', user.id)

      if (error) {
        // Handle specific Supabase errors
        if (error.code === 'PGRST116') return []
        throw error
      }
      return data
    },
    enabled: !!user?.id,
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (error?.message?.includes('auth')) return false
      return failureCount < 3
    },
  })
}
```

### Form Validation Pattern (React Hook Form + Zod)
```typescript
// Define schema with Zod
const schema = z.object({
  name: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
})

// Use with React Hook Form
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '', email: '' }
})
```

### Component Composition Pattern (shadcn/ui)
- All UI components extend shadcn/ui primitives
- Forms use consistent Dialog + Form + validation pattern
- Data displays use Card components with loading states
- Modals use Dialog with AnimatePresence for animations

### Database Access Pattern (Direct Supabase Client)
```typescript
// Direct Supabase queries with RLS protection
const { data, error } = await supabase
  .from('Property')
  .select(`
    *,
    units:Unit (
      id, unitNumber, rent, status,
      leases:Lease (
        id, startDate, endDate,
        tenant:Tenant (id, name, email)
      )
    )
  `)
  .eq('ownerId', user.id)
  .order('createdAt', { ascending: false })

// RLS automatically filters results by ownership
// No server-side API layer - direct client-to-database communication
```

### State Management Pattern (Zustand)
```typescript
// Global auth state with async actions
export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  signIn: async (email, password) => {
    // Implementation with error handling
  }
}))
```

## Environment Variables Required

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://...         # Supabase project URL
VITE_SUPABASE_ANON_KEY=eyJ...        # Supabase anon key

# External Services
VITE_RESEND_API_KEY=re_...           # Resend API key for emails
GOOGLE_CLIENT_ID=...                  # Google OAuth client ID
GOOGLE_CLIENT_SECRET=...              # Google OAuth secret
```

## Testing Strategy

### Type Safety
- Run `npm run tsc` to check TypeScript errors (uses tsconfig.app.json)
- All components must have proper type definitions
- Avoid `any` types - use proper interfaces from `src/types/`
- Types are organized by domain in `src/types/` directory

### E2E Testing (Playwright)
- Tests located in `./tests` directory
- Configured to run on port 5173 (matching dev server)
- Base URL: `http://localhost:5173` (CI: `https://tenantflow.app`)
- Uses Chromium, Firefox, and WebKit by default
- Mobile viewports included (Pixel 5, iPhone 12)
- Automatically starts dev server before tests
- Run `npm run test` for headless tests
- Run `npm run test:ui` for interactive UI mode
- Run `npm run test:headed` to see browser during tests

### Unit Testing (Vitest)
- Test files use `.test.ts` or `.spec.ts` extensions
- Vitest configuration embedded in Vite config
- Run `npm run test:unit` for single run
- Run `npm run test:unit:watch` for watch mode
- Run `npm run test:unit:ui` for UI mode
- Integration tests: `npm run test:integration`

### Manual Testing Checklist
1. **Auth Flow**: Sign up → Auto profile creation → Sign in → Access control
2. **Property Management**: Create → Edit → Delete → View
3. **Tenant Invitation**: Send invite → Accept → Create account → Access portal
4. **Data Isolation**: User A cannot see User B's data

## Common Development Tasks

### Adding a New Feature
1. Add components under appropriate `src/components/{domain}/` folder
2. Create custom hook for data fetching in `src/hooks/`
3. Define types in `src/types/{feature}.ts`
4. Add route in `src/App.tsx`
5. Update navigation in `src/lib/navigation-variants.ts`

### Working with Database
1. Update database schema directly in Supabase Dashboard or via SQL files
2. Run `npm run db:types` to regenerate TypeScript types
3. Update RLS policies in `supabase/` SQL files if needed
4. Update relationship types in `src/types/relationships.ts` for complex queries
5. Test queries using Supabase client in development

### Debugging Authentication Issues
1. Check browser console for Supabase auth errors
2. Verify auth trigger exists: `supabase/fix-auth-trigger.sql`
3. Check if User profile was created in database using Supabase Dashboard
4. Use `src/pages/auth/TestLogin.tsx` for isolated testing
5. Check Zustand auth store state in React DevTools
6. Verify RLS policies in Supabase Dashboard

## Current Implementation Status

### ✅ Production Ready
- ✅ **Database & RLS**: Fully configured with owner-based security
- ✅ **Authentication**: Google OAuth and session management working
- ✅ **UI Components**: Complete shadcn/ui library (40+ components)
- ✅ **Property Management**: CRUD operations with form validation
- ✅ **Tenant Portal**: Read-only property/lease access
- ✅ **Type Safety**: Automated TypeScript generation with proper enums
- ✅ **Performance**: Fixed aggressive React Query polling (5-min cache, no auto-refetch)

### ✅ **WORKING - EMAIL INVITATION SYSTEM**
**Location**: `src/hooks/useTenants.ts` (useInviteTenant mutation)

**Current Status**: FULLY OPERATIONAL - All issues resolved
1. ✅ **Supabase Edge Function**: Deployed and working with tenantflow.app domain
2. ✅ **Email Delivery**: Successfully sending via Resend API
3. ✅ **Domain Verification**: tenantflow.app verified and operational
4. ✅ **Error Handling**: Proper success/failure responses

**What Works:**
- ✅ Tenant record creation in database
- ✅ Invitation token generation
- ✅ Form validation and UI
- ✅ Email sending with professional HTML templates
- ✅ Edge function deployed to production Supabase
- ✅ Success toasts and user feedback
- ✅ Copy-to-clipboard functionality for manual sharing

**Files Created/Modified for Email System:**
- `/supabase/functions/send-invitation/index.ts` - Edge function (works locally)
- `/src/lib/react19-polyfill.ts` - Attempted fix for React 19 issues
- `/test-email-browser.html` - Manual testing (works with curl)
- `/test-email-function.html` - Edge function testing
- `/DEPLOY-COMMANDS.md` - Deployment instructions when CLI works

**Next Steps When Ready:**
1. Fix Supabase CLI authentication issue first
2. Deploy edge function: `supabase functions deploy send-invitation`
3. Set production environment variable: `RESEND_API_KEY`
4. OR investigate React 19 + @react-email compatibility issues
5. OR use simple HTML email template instead of React Email

**Error Messages to Search For:**
- "ReadableByteStreamController is not implemented"
- "FunctionsFetchError: Failed to send a request to the Edge Function"
- "Preflight response is not successful. Status code: 404"

### 🚧 In Progress  
- Property detail pages with full unit and lease information
- Complete maintenance request system
- Property image uploads to Supabase Storage
- ❌ **EMAIL SYSTEM** - See broken section above

### ✅ Recently Fixed Issues
- ✅ **403 Forbidden Errors**: Fixed broken RLS policies with consistent auth.uid() usage
- ✅ **500 Server Errors**: Fixed Payment table schema mismatch and duplicate RLS policies
- ✅ **Aggressive Polling**: Removed 30-second activity feed polling
- ✅ **Query Spam**: Added proper React Query defaults to prevent excessive requests
- ✅ **Production RLS**: Implemented proper server-side filtering for all data queries
- ✅ **Complex Joins**: Restored full relational queries with proper RLS protection

### ⚠️ Known Issues
- Payment system implemented but needs Stripe configuration for production
- README.md is generic Vite template and doesn't reflect actual project
- Hardcoded database connection string in `scripts/generate-types-psql.cjs` (security risk)
- Unused React Router v7 dependencies (@react-router/fs-routes, @react-router/dev) that aren't being utilized

## File Organization

### Component Structure
Components follow a feature-based organization:
```
src/components/
  ├── auth/           # Authentication components
  ├── common/         # Shared components (ProtectedRoute, ErrorBoundary)
  ├── dashboard/      # Dashboard-specific components
  ├── layout/         # Layout components (AppLayout, Header, Sidebar)
  ├── properties/     # Property management components
  ├── tenants/        # Tenant management components
  ├── ui/            # shadcn/ui primitive components (40+ components)
  └── ...
```

### Direct Imports Required
- **No barrel files/index.ts** - Always import directly from source file
- Example: `import { Button } from '@/components/ui/button'` not from index
- This prevents circular dependencies and keeps import paths transparent

### Type Organization
All types are centralized in `src/types/` organized by domain:
```
src/types/
  ├── auth.ts               # Authentication types (uses Supabase User type)
  ├── database.ts           # Database types with helper utilities
  ├── query-types.ts        # TanStack Query types
  ├── relationships.ts      # Manual relationship types for complex queries
  └── supabase-generated.ts # Auto-generated database types from psql
```

## Build Configuration & Performance Optimizations

### Vite Configuration
- **Dev Server**: Runs on port 5173 with host `0.0.0.0` (allows external access)
- **Proxy Configuration**: `/api` routes proxy to `localhost:3001`
- **Path Aliases**:
  - `@/` → `./src/`
  - `~/` → `./app/`
- **Tailwind CSS v4**: Uses Vite plugin for fast HMR

### Production Build Optimization
The build is optimized with manual code splitting for better performance:
- **react-vendor**: Core React libraries
- **ui-vendor**: All Radix UI components
- **form-vendor**: Form handling libraries (React Hook Form, Zod)
- **animation-vendor**: Animation libraries (Framer Motion, Lucide)
- **data-vendor**: Data fetching (TanStack Query, Supabase)
- **utility-vendor**: Utilities (date-fns, clsx, tailwind-merge)
- **chart-vendor**: Charting library (Recharts)
- **email-vendor**: Email libraries (React Email, Resend)

### Performance Best Practices
1. **Lazy Loading**: Most routes use React.lazy() for code splitting
2. **React Query Defaults**: 5-minute cache, no automatic refetching
3. **Optimized Imports**: Direct imports only (no barrel files)
4. **CSS Code Splitting**: Enabled in Vite build config
5. **Chunk Size Limit**: Set to 600KB to balance performance
