DB & Query Layer – Core Epic

	1.	Centralize DB error handling
Create a shared Supabase/Nest error handler that maps PostgREST errors to proper Nest exceptions (NotFound, Conflict, BadRequest, etc.) and wire this through Nest’s exception filters. Remove ad-hoc try/catch from controllers and services.

	2.	Provide typed helpers for common queries
Introduce strongly typed helpers (e.g., querySingle-style) that execute Supabase queries, inspect { data, error }, and either return typed data or throw mapped exceptions. Replace direct .single() + null checks across the codebase.

	3.	Use structured logging with detailed payloads
In the shared DB helpers, log structured context (resource type, id, operation, correlation id) before throwing. Ensure logs are consistent and machine-parsable.

	4.	Incremental rollout of new DB helpers
With ~147 call sites, migrate modules gradually to the new helpers. Keep helper signatures stable, maintain full test coverage, and track completion until all direct Supabase usage is wrapped.

	5.	Enforce shared query cache times
Refactor all 40+ React/query hooks to consume shared cache-time constants (Lists 10min, Details 5min, Stats 1min) instead of hardcoded values.

	6.	Audit and reduce getAdminClient() usage
Review all getAdminClient() call sites. Replace with user-scoped clients wherever RLS bypass isn’t strictly required. Document and justify the remaining true-admin usages.

Auth, Security, and Data Integrity
	7.	Create RequireUserIdGuard
Implement a reusable guard that enforces the presence of a valid user id and replace inline auth checks with this guard.

	8.	Secure payment status endpoint with ownership guard
Add a property-ownership guard to the payment status endpoint so only authorized owners can access it.

	9.	Add UUID validation to Stripe controller
Apply UUID validation to all Stripe controller endpoints that accept UUID parameters.

	10.	Prevent email header injection in invitations
Sanitize and normalize email headers in the tenant invitation service to avoid header injection attacks.

	11.	Add UUID validation to all UUID endpoints
Ensure all endpoints expecting UUID route/query parameters are guarded by UUID validation, not just Stripe-related ones.

	12.	Add Helmet security headers
Integrate Helmet (or equivalent middleware) into the backend HTTP stack with a sensible default security header configuration.

	13.	Add rate limiting to webhook endpoints
Add rate limiting middleware to all webhook endpoints with thresholds and logging appropriate for webhook traffic.

	14.	Rate limit tenant invitation endpoint
Add rate limiting to the invitation endpoint to protect against abuse, brute forcing, or mass-invite spam.

	15.	Enforce LeaseStatus via DB CHECK constraint
Add a database-level constraint ensuring LeaseStatus can only store valid, known values.

Application Correctness & Business Rules
	16.	Wire health thresholds to ConfigService / env
Move health/metrics thresholds out of hardcoded values and into configuration managed by ConfigService / env vars.

	17.	Standardize payment receipt date precedence
Define and implement a single canonical rule for which timestamp is considered the “payment receipt date” when
multiple exist.

	18.	Add explicit onError / onSuccess in tenant portal hooks
Ensure tenant portal operations explicitly handle success/failure with correct UI and logging behavior.

	19.	Add explicit retry configuration for tenant portal queries
Configure retry, retryDelay, and onError for tenant portal queries intentionally instead of relying on library defaults.

	20.	Fix env var validation and header standardization in RLS tests
Make sure RLS boundary tests properly validate required environment variables and headers, matching real runtime expectations.

	21.	Use ConfigService instead of process.env.NODE_ENV
Replace direct process.env.NODE_ENV usage with ConfigService so environment behavior is consistent across environments and tests.

	22.	Throw errors instead of returning null from retry utility
Replace “null on failure” with explicit errors so callers must handle failure paths.

	23.	Replace sequential maintenance queries with eager loading
Refactor the maintenance update flow to use an eager-loading pattern and eliminate 50–100 ms wasted latency per operation.

	24.	Create optimized unit stats RPC
Implement an optimized database RPC for unit stats (targeting 200 ms → 100 ms) and update the application to consume it.

	25.	Increase property stats cache duration
Raise cache duration from 30 seconds to 3 minutes to reduce repeated computation and load on stats endpoints.

	26.	Replace hardcoded lease status strings with constants
Ensure all lease-related UI and logic use shared LEASE_STATUS constants aligned with backend values.

	27.	Implement robust 409 conflict handling in forms
In lease/maintenance/unit forms, correctly detect HTTP 409 conflicts and surface appropriate UX instead of silently overwriting or failing.
	28.	Add per-fetch error handling for property/unit loading

Ensure each fetch for properties/units has explicit error handling and does not rely solely on generic error handlers.

	29.	Enforce strict priority union in maintenance forms
Use a strict union ('LOW' | 'MEDIUM' | 'HIGH' | 'URGENT') for priority values and align backend expectations to match.

	30.	Restore validation in nextStep() for tenant form
Ensure wizard step transitions re-run validation and cannot skip required fields.

	31.	Add field-level checks or validation callback in tenant form
Introduce more granular field-level validation or a validation callback pattern to avoid partial-invalid states.

	32.	Ensure FAQ tracking calls handle failures and log them
Check response.ok in FAQ tracking calls and log warnings when they fail instead of silently ignoring issues.

	33.	Fix dashboard activities RPC column naming
Update the get_user_dashboard_activities RPC to use camelCase column names that match typed client expectations.

Performance & Infra (Systemic)
	34.	Extract shared query invalidation utilities
Consolidate duplicated query invalidation patterns into shared utilities and refactor ~50 call sites to use them.

	35.	Standardize logger initialization across the codebase
Normalize logger initialization across all files so log fields, formats, and behavior are consistent.

	36.	Extract shared prefetching logic
Move duplicated prefetching logic into a shared utility and switch existing usage to call that utility.

	37.	Add response compression middleware
Add response compression to the backend to reduce payload sizes on suitable routes.

	38.	Add CDN cache-control headers
Configure Cache-Control headers to allow CDN caching for static and semi-static assets.

	39.	Reduce large component re-renders
Identify hot components that re-render excessively and add memoization (or equivalent strategies) where appropriate.

	40.	Implement list virtualization for large lists
Virtualize lists with 200+ items to avoid huge render cycles and main-thread jank.

Type Safety & Code Health Sweep
	41.	Eliminate any from production code
Replace all any usages in production code with concrete types. Prefer domain-specific or branded types where it improves correctness and future refactor safety.

CSS TODO:

Based on my comprehensive analysis, here are the exact locations of CSS and animation violations, including inline icons, emojis, and spacing/padding/layout issues:

## **INLINE ICONS AND SVG VIOLATIONS**

### **apps/frontend/src/components/layout/footer.tsx**
- **Line 25**: Inline SVG with hardcoded dimensions `w-2.5 h-2.5` instead of using Lucide React icons
- **Lines 22-30**: Custom SVG implementation instead of using `CheckCircle` or other Lucide icons

### **apps/frontend/src/components/auth/login-layout.tsx**
- **Lines 68-78**: Inline SVG logo instead of using Lucide React icon
- **Lines 132-142**: Inline SVG logo instead of using Lucide React icon

### **apps/frontend/src/components/ui/dropzone.tsx**
- **Lines 25-27**: Direct `<img>` usage instead of proper icon components

## **EMOJI VIOLATIONS**
- **No emojis found** in the codebase - all text-based icons are properly implemented with Lucide React icons

## **HARDCODED SPACING AND PADDING VIOLATIONS**

### **apps/frontend/src/components/layout/footer.tsx**
- **Line 2**: `py-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 3**: `px-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 5**: `gap-8` - hardcoded gap instead of using globals.css spacing tokens

### **apps/frontend/src/components/sections/features-section.tsx**
- **Line 4**: `px-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 6**: `mb-10` - hardcoded margin instead of using globals.css spacing tokens
- **Line 7**: `max-w-3xl` - hardcoded width instead of using globals.css spacing tokens
- **Line 18**: `mb-4` - hardcoded margin instead of using globals.css spacing tokens
- **Line 22**: `size-2` - hardcoded size instead of using globals.css spacing tokens
- **Line 25**: `w-1.5 h-1.5` - hardcoded dimensions instead of using globals.css spacing tokens

### **apps/frontend/src/components/auth/signup-form.tsx**
- **Line 2**: `p-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 8**: `mt-4` - hardcoded margin instead of using globals.css spacing tokens
- **Line 10**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens

### **apps/frontend/src/components/dashboard/app-sidebar.tsx**
- **Line 2**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 4**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 12**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 14**: `px-3 py-2` - hardcoded padding instead of using globals.css spacing tokens
- **Line 17**: `px-2 py-0.5` - hardcoded padding instead of using globals.css spacing tokens
- **Line 23**: `p-4` - hardcoded padding instead of using globals.css spacing tokens

### **apps/frontend/src/components/dashboard/section-table.tsx**
- **Line 23**: `p-3 sm:p-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 33**: `py-8` - hardcoded padding instead of using globals.css spacing tokens
- **Line 37**: `ml-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 44**: `py-8` - hardcoded padding instead of using globals.css spacing tokens
- **Line 54**: `py-8` - hardcoded padding instead of using globals.css spacing tokens
- **Line 70**: `p-3 sm:p-6` - hardcoded padding instead of using globals.css spacing tokens

### **apps/frontend/src/components/dashboard/property-performance-table.tsx**
- **Line 8**: `size-11` - hardcoded size instead of using globals.css spacing tokens
- **Line 12**: `min-h-11` - hardcoded height instead of using globals.css spacing tokens

### **apps/frontend/src/components/leases/pay-rent-dialog.tsx**
- **Line 15**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 17**: `mb-1` - hardcoded margin instead of using globals.css spacing tokens
- **Line 22**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 23**: `pt-4` - hardcoded padding instead of using globals.css spacing tokens

### **apps/frontend/src/components/pricing/kibo-style-pricing.tsx**
- **Line 4**: `gap-8` - hardcoded gap instead of using globals.css spacing tokens
- **Line 6**: `px-4 sm:px-6 lg:px-0` - hardcoded padding instead of using globals.css spacing tokens
- **Line 10**: `gap-6` - hardcoded gap instead of using globals.css spacing tokens
- **Line 31**: `pb-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 35**: `space-y-2` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 41**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 47**: `space-y-3` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 51**: `gap-3` - hardcoded gap instead of using globals.css spacing tokens
- **Line 65**: `gap-8` - hardcoded gap instead of using globals.css spacing tokens

### **apps/frontend/src/components/auth/login-form.tsx**
- **Line 3**: `mb-4` - hardcoded margin instead of using globals.css spacing tokens
- **Line 4**: `p-2` - hardcoded padding instead of using globals.css spacing tokens
- **Line 6**: `text-xs` - hardcoded text size instead of using globals.css typography tokens
- **Line 10**: `mb-4` - hardcoded margin instead of using globals.css spacing tokens
- **Line 11**: `p-2` - hardcoded padding instead of using globals.css spacing tokens
- **Line 13**: `text-xs` - hardcoded text size instead of using globals.css typography tokens
- **Line 20**: `space-y-5` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 28**: `p-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 33**: `space-y-4` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 36**: `pt-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 42**: `w-full h-11` - hardcoded dimensions instead of using globals.css spacing tokens
- **Line 55**: `px-3` - hardcoded padding instead of using globals.css spacing tokens

### **apps/frontend/src/components/leases/lease-form.client.tsx**
- **Line 3**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 8**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 13**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 19**: `gap-3` - hardcoded gap instead of using globals.css spacing tokens

### **apps/frontend/src/components/auth/tenant-guard.tsx**
- **Line 2**: `p-8` - hardcoded padding instead of using globals.css spacing tokens
- **Line 3**: `space-y-4` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 5**: `h-8` - hardcoded height instead of using globals.css spacing tokens
- **Line 6**: `w-64` - hardcoded width instead of using globals.css spacing tokens
- **Line 8**: `h-64` - hardcoded height instead of using globals.css spacing tokens
- **Line 9**: `w-full` - hardcoded width instead of using globals.css spacing tokens

### **apps/frontend/src/components/leases/lease-generation-form.tsx**
- **Line 2**: `p-8` - hardcoded padding instead of using globals.css spacing tokens
- **Line 4**: `space-y-2` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 8**: `size-8` - hardcoded size instead of using globals.css spacing tokens
- **Line 14**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 20**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 26**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 38**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 46**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 54**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 65**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 72**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 82**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 90**: `pt-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 92**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens

### **apps/frontend/src/components/auth/password-strength.tsx**
- **Line 17**: `p-[var(--spacing-4)]` - partially correct but should use consistent spacing tokens
- **Line 21**: `gap-1` - hardcoded gap instead of using globals.css spacing tokens
- **Line 22**: `h-2` - hardcoded height instead of using globals.css spacing tokens
- **Line 35**: `mt-4` - hardcoded margin instead of using globals.css spacing tokens
- **Line 36**: `mb-3` - hardcoded margin instead of using globals.css spacing tokens
- **Line 37**: `text-sm` - hardcoded text size instead of using globals.css typography tokens

### **apps/frontend/src/components/pricing/customer-portal.tsx**
- **Line 15**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 22**: `mb-6` - hardcoded margin instead of using globals.css spacing tokens
- **Line 24**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 28**: `p-2` - hardcoded padding instead of using globals.css spacing tokens
- **Line 30**: `mb-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 36**: `grid-cols-2 lg:grid-cols-5` - hardcoded grid columns instead of using globals.css layout tokens
- **Line 38**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 39**: `size-10` - hardcoded size instead of using globals.css spacing tokens
- **Line 40**: `mb-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 44**: `text-2xl` - hardcoded text size instead of using globals.css typography tokens
- **Line 51**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 52**: `size-10` - hardcoded size instead of using globals.css spacing tokens
- **Line 53**: `mb-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 57**: `text-2xl` - hardcoded text size instead of using globals.css typography tokens
- **Line 64**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 65**: `size-10` - hardcoded size instead of using globals.css spacing tokens
- **Line 66**: `mb-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 70**: `text-2xl` - hardcoded text size instead of using globals.css typography tokens
- **Line 77**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 78**: `size-10` - hardcoded size instead of using globals.css spacing tokens
- **Line 82**: `text-2xl` - hardcoded text size instead of using globals.css typography tokens
- **Line 91**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 92**: `size-10` - hardcoded size instead of using globals.css spacing tokens
- **Line 96**: `text-2xl` - hardcoded text size instead of using globals.css typography tokens
- **Line 104**: `p-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 108**: `mb-6` - hardcoded margin instead of using globals.css spacing tokens
- **Line 110**: `gap-3` - hardcoded gap instead of using globals.css spacing tokens
- **Line 112**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 114**: `mb-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 120**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 12**: `mb-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 128**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 130**: `mb-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 137**: `space-y-4` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 141**: `mb-16` - hardcoded margin instead of using globals.css spacing tokens
- **Line 148**: `p-5` - hardcoded padding instead of using globals.css spacing tokens
- **Line 150**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 151**: `mb-3` - hardcoded margin instead of using globals.css spacing tokens
- **Line 153**: `p-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 160**: `p-5` - hardcoded padding instead of using globals.css spacing tokens
- **Line 162**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 163**: `mb-3` - hardcoded margin instead of using globals.css spacing tokens
- **Line 165**: `p-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 172**: `p-5` - hardcoded padding instead of using globals.css spacing tokens
- **Line 174**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 175**: `mb-3` - hardcoded margin instead of using globals.css spacing tokens
- **Line 177**: `p-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 184**: `p-5` - hardcoded padding instead of using globals.css spacing tokens
- **Line 186**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 187**: `mb-3` - hardcoded margin instead of using globals.css spacing tokens
- **Line 190**: `p-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 198**: `p-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 200**: `gap-6` - hardcoded gap instead of using globals.css spacing tokens

### **apps/frontend/src/components/dashboard/chart-area-interactive.tsx**
- **Line 2**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 3**: `space-y-0` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 4**: `py-5` - hardcoded padding instead of using globals.css spacing tokens
- **Line 6**: `gap-1` - hardcoded gap instead of using globals.css spacing tokens
- **Line 7**: `text-center` - hardcoded text alignment instead of using globals.css typography tokens
- **Line 15**: `w-40` - hardcoded width instead of using globals.css spacing tokens
- **Line 16**: `rounded-lg` - hardcoded border radius instead of using globals.css radius tokens
- **Line 18**: `ml-auto` - hardcoded margin instead of using globals.css spacing tokens
- **Line 19**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 23**: `rounded-lg` - hardcoded border radius instead of using globals.css radius tokens
- **Line 24**: `px-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 25**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 29**: `rounded-lg` - hardcoded border radius instead of using globals.css radius tokens
- **Line 30**: `px-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 31**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 35**: `rounded-lg` - hardcoded border radius instead of using globals.css radius tokens
- **Line 36**: `px-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 37**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 41**: `rounded-lg` - hardcoded border radius instead of using globals.css radius tokens
- **Line 42**: `px-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 43**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 49**: `grid-cols-2` - hardcoded grid columns instead of using globals.css layout tokens
- **Line 50**: `gap-4` - hardcoded gap instead of using globals.css spacing tokens
- **Line 51**: `p-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 52**: `pb-0` - hardcoded padding instead of using globals.css spacing tokens
- **Line 53**: `lg:grid-cols-4` - hardcoded grid columns instead of using globals.css layout tokens
- **Line 54**: `space-y-1` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 65**: `px-2` - hardcoded padding instead of using globals.css spacing tokens
- **Line 66**: `pt-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 67**: `sm:px-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 68**: `sm:pt-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 71**: `items-center` - hardcoded flex alignment instead of using globals.css layout tokens
- **Line 72**: `justify-center` - hardcoded flex alignment instead of using globals.css layout tokens
- **Line 73**: `h-75` - hardcoded height instead of using globals.css spacing tokens
- **Line 78**: `flex-col` - hardcoded flex direction instead of using globals.css layout tokens
- **Line 79**: `items-center` - hardcoded flex alignment instead of using globals.css layout tokens
- **Line 80**: `justify-center` - hardcoded flex alignment instead of using globals.css layout tokens
- **Line 81**: `h-75` - hardcoded height instead of using globals.css spacing tokens
- **Line 82**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 87**: `flex-col` - hardcoded flex direction instead of using globals.css layout tokens
- **Line 88**: `items-center` - hardcoded flex alignment instead of using globals.css layout tokens
- **Line 89**: `justify-center` - hardcoded flex alignment instead of using globals.css layout tokens
- **Line 90**: `h-75` - hardcoded height instead of using globals.css spacing tokens
- **Line 91**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 98**: `aspect-auto` - hardcoded aspect ratio instead of using globals.css layout tokens
- **Line 99**: `h-75` - hardcoded height instead of using globals.css spacing tokens
- **Line 100**: `w-full` - hardcoded width instead of using globals.css spacing tokens

### **apps/frontend/src/components/auth/forgot-password-modal.tsx**
- **Line 4**: `left-3` - hardcoded position instead of using globals.css spacing tokens
- **Line 5**: `size-4` - hardcoded size instead of using globals.css spacing tokens
- **Line 7**: `pl-9` - hardcoded padding instead of using globals.css spacing tokens
- **Line 10**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 14**: `size-4` - hardcoded size instead of using globals.css spacing tokens
- **Line 15**: `mr-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 20**: `size-12` - hardcoded size instead of using globals.css spacing tokens
- **Line 21**: `size-6` - hardcoded size instead of using globals.css spacing tokens
- **Line 26**: `mt-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 34**: `gap-2` - hardcoded gap instead of using globals.css spacing tokens
- **Line 38**: `size-4` - hardcoded size instead of using globals.css spacing tokens
- **Line 39**: `mr-2` - hardcoded margin instead of using globals.css spacing tokens

### **apps/frontend/src/components/auth/update-password-form.tsx**
- **Line 2**: `bg-primary/10` - hardcoded background opacity instead of using globals.css color tokens
- **Line 3**: `p-3` - hardcoded padding instead of using globals.css spacing tokens
- **Line 4**: `size-6` - hardcoded size instead of using globals.css spacing tokens
- **Line 7**: `space-y-2` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 8**: `font-bold` - hardcoded font weight instead of using globals.css typography tokens
- **Line 9**: `tracking-tight` - hardcoded tracking instead of using globals.css typography tokens
- **Line 10**: `text-3xl` - hardcoded text size instead of using globals.css typography tokens
- **Line 14**: `text-xs` - hardcoded text size instead of using globals.css typography tokens
- **Line 15**: `gap-1` - hardcoded gap instead of using globals.css spacing tokens
- **Line 16**: `size-3` - hardcoded size instead of using globals.css spacing tokens
- **Line 20**: `text-xs` - hardcoded text size instead of using globals.css typography tokens
- **Line 21**: `gap-1` - hardcoded gap instead of using globals.css spacing tokens
- **Line 22**: `size-3` - hardcoded size instead of using globals.css spacing tokens
- **Line 28**: `size-4` - hardcoded size instead of using globals.css spacing tokens
- **Line 29**: `mr-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 33**: `size-4` - hardcoded size instead of using globals.css spacing tokens
- **Line 34**: `mr-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 41**: `pt-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 42**: `border-t` - hardcoded border instead of using globals.css border tokens
- **Line 43**: `text-xs` - hardcoded text size instead of using globals.css typography tokens

### **apps/frontend/src/components/auth/change-password-dialog.tsx**
- **Line 15**: `space-y-6` - hardcoded spacing instead of using globals.css spacing tokens
- **Line 16**: `mt-4` - hardcoded margin instead of using globals.css spacing tokens
- **Line 20**: `w-full` - hardcoded width instead of using globals.css spacing tokens
- **Line 21**: `pr-10` - hardcoded padding instead of using globals.css spacing tokens
- **Line 24**: `right-3` - hardcoded position instead of using globals.css spacing tokens
- **Line 25**: `top-1/2` - hardcoded position instead of using globals.css spacing tokens
- **Line 26**: `translate-y-1/2` - hardcoded transform instead of using globals.css transform tokens
- **Line 30**: `w-full` - hardcoded width instead of using globals.css spacing tokens
- **Line 31**: `pr-10` - hardcoded padding instead of using globals.css spacing tokens
- **Line 34**: `right-3` - hardcoded position instead of using globals.css spacing tokens
- **Line 35**: `top-1/2` - hardcoded position instead of using globals.css spacing tokens
- **Line 36**: `translate-y-1/2` - hardcoded transform instead of using globals.css transform tokens
- **Line 43**: `w-full` - hardcoded width instead of using globals.css spacing tokens
- **Line 44**: `pr-10` - hardcoded padding instead of using globals.css spacing tokens
- **Line 47**: `right-3` - hardcoded position instead of using globals.css spacing tokens
- **Line 48**: `top-1/2` - hardcoded position instead of using globals.css spacing tokens
- **Line 49**: `translate-y-1/2` - hardcoded transform instead of using globals.css transform tokens
- **Line 53**: `mt-1` - hardcoded margin instead of using globals.css spacing tokens
- **Line 54**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 61**: `rounded-lg` - hardcoded border radius instead of using globals.css radius tokens
- **Line 62**: `border` - hardcoded border instead of using globals.css border tokens
- **Line 63**: `p-4` - hardcoded padding instead of using globals.css spacing tokens
- **Line 66**: `font-semibold` - hardcoded font weight instead of using globals.css typography tokens
- **Line 68**: `mb-2` - hardcoded margin instead of using globals.css spacing tokens
- **Line 71**: `list-disc` - hardcoded list style instead of using globals.css layout tokens
- **Line 72**: `list-inside` - hardcoded list style instead of using globals.css layout tokens
- **Line 73**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 80**: `gap-3` - hardcoded gap instead of using globals.css spacing tokens
- **Line 81**: `pt-2` - hardcoded padding instead of using globals.css spacing tokens

## **LAYOUT AND GRID VIOLATIONS**

### **apps/frontend/src/components/dashboard/section-table.tsx**
- **Line 72**: `min-w-35` - hardcoded minimum width instead of using globals.css spacing tokens
- **Line 74**: `min-w-20` - hardcoded minimum width instead of using globals.css spacing tokens
- **Line 84**: `size-4` - hardcoded size instead of using globals.css spacing tokens
- **Line 88**: `gap-1` - hardcoded gap instead of using globals.css spacing tokens
- **Line 89**: `size-3` - hardcoded size instead of using globals.css spacing tokens

### **apps/frontend/src/components/dashboard/property-performance-table.tsx**
- **Line 8**: `size-11` - hardcoded size instead of using globals.css spacing tokens

### **apps/frontend/src/components/pricing/kibo-style-pricing.tsx**
- **Line 10**: `gap-6` - hardcoded gap instead of using globals.css spacing tokens
- **Line 31**: `pb-6` - hardcoded padding instead of using globals.css spacing tokens
- **Line 41**: `gap-3` - hardcoded gap instead of using globals.css spacing tokens
- **Line 65**: `gap-8` - hardcoded gap instead of using globals.css spacing tokens

### **apps/frontend/src/components/dashboard/chart-area-interactive.tsx**
- **Line 49**: `grid-cols-2` - hardcoded grid columns instead of using globals.css layout tokens
- **Line 53**: `lg:grid-cols-4` - hardcoded grid columns instead of using globals.css layout tokens

## **TYPOGRAPHY VIOLATIONS**

### **apps/frontend/src/components/dashboard/chart-area-interactive.tsx**
- **Line 25**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 31**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 37**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 43**: `text-sm` - hardcoded text size instead of using globals.css typography tokens

### **apps/frontend/src/components/auth/forgot-password-modal.tsx**
- **Line 14**: `text-xs` - hardcoded text size instead of using globals.css typography tokens
- **Line 20**: `text-xs` - hardcoded text size instead of using globals.css typography tokens

### **apps/frontend/src/components/auth/update-password-form.tsx**
- **Line 8**: `font-bold` - hardcoded font weight instead of using globals.css typography tokens
- **Line 9**: `tracking-tight` - hardcoded tracking instead of using globals.css typography tokens
- **Line 10**: `text-3xl` - hardcoded text size instead of using globals.css typography tokens
- **Line 14**: `text-xs` - hardcoded text size instead of using globals.css typography tokens
- **Line 20**: `text-xs` - hardcoded text size instead of using globals.css typography tokens
- **Line 43**: `text-xs` - hardcoded text size instead of using globals.css typography tokens

### **apps/frontend/src/components/auth/change-password-dialog.tsx**
- **Line 54**: `text-sm` - hardcoded text size instead of using globals.css typography tokens
- **Line 71**: `text-sm` - hardcoded text size instead of using globals.css typography tokens

These violations break the design system consistency by using hardcoded values instead of the globals.css tokens that define the TenantFlow design system. The spacing tokens, typography scales, and layout patterns should all use the predefined CSS variables from globals.css.