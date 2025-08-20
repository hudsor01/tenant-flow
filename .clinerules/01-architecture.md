# TenantFlow Architecture Rules

## Multi-Tenant Security (Non-Negotiable)
- **RLS Enforcement**: All database queries MUST use Row Level Security with org_id filtering
- **Auto-Filtering**: BaseCrudService automatically handles org_id isolation
- **No Direct Queries**: Never bypass RLS with direct Supabase client usage in controllers

## Service Architecture Patterns
- **BaseCrudService Extension**: All CRUD services extend BaseCrudService<Entity>
- **Repository Pattern**: Use dedicated repositories for Supabase operations
- **Dependency Injection**: Proper NestJS DI with constructor injection

## Frontend Architecture (React 19 + Next.js 15)
- **Server Components First**: Default to server components, minimal client components
- **Turbopack Required**: React 19 breaks with webpack - always use `npm run dev`
- **Client Component Marking**: Explicitly mark with 'use client' only when necessary

## Type Safety
- **Shared Types**: Import from `@repo/shared` instead of local definitions
- **Strict TypeScript**: No `any` types allowed, use proper type definitions
- **Generated Types**: Keep Supabase types current with `npm run update-supabase-types`

## API Design
- **Input Validation**: Use Zod schemas for all user inputs
- **Error Handling**: Comprehensive try-catch with typed error responses
- **JWT Guards**: Protect all endpoints with JwtAuthGuard
- **Response Format**: Consistent API response structure

## Performance Requirements
- **Lazy Loading**: Dynamic imports for large components
- **Image Optimization**: Use Next.js Image component, never `<img>`
- **Bundle Optimization**: Minimize client-side JavaScript
- **Database Efficiency**: Optimize queries and use proper indexing