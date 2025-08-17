# TenantFlow Knowledge Graph Summary

## Graph Statistics
- **Total Entities**: 28
- **Total Relations**: 74
- **Entity Types**: Project, Documentation, Technology, Framework, Platform, Design Pattern, Architecture Pattern, Business Domain, Infrastructure, Process, Challenge

## Core Entity Network

### Central Hub: TenantFlow Project
**Direct Connections**: 13
- Uses: React 19, Next.js 15, NestJS, Supabase
- Integrates: Stripe
- Deployed on: Railway, Vercel
- Managed by: Turborepo
- Validated by: Test Suite
- Implements: Multi-Tenant Architecture
- Built with: Frontend Stack, Backend Stack
- Developed using: Development Workflow
- Runs in: Production Environment
- Has: Technical Debt
- Documented in: CLAUDE.md
- Undergoing: Supabase Migration

### Technology Stacks

#### Frontend Stack (7 connections)
- Includes: React 19, Next.js 15, Turbopack, Zustand, TanStack Query, Radix UI
- Validated by: Test Suite

#### Backend Stack (5 connections)
- Includes: NestJS, Supabase, BaseSupabaseRepository, BaseCrudService
- Contains: Properties, Tenants, Leases, Maintenance Modules

### Critical Dependencies

#### React 19 → Turbopack (REQUIRED)
- React 19 requires Turbopack for compatibility
- Next.js 15 bundled by Turbopack
- Development Workflow uses Turbopack

#### Supabase Network (6 connections)
- Enables: Multi-Tenant Architecture
- Accessed through: BaseSupabaseRepository
- Target of: Supabase Migration
- Part of: Backend Stack, Production Environment

### Design Patterns

#### BaseSupabaseRepository (6 connections)
- Implements for: Properties, Tenants, Leases, Maintenance Modules
- Used by: BaseCrudService
- Part of: Backend Stack

#### BaseCrudService (3 connections)
- Enforces: Multi-Tenant Architecture
- Used by: BaseSupabaseRepository
- Part of: Backend Stack

### Business Modules (All 4 connected)
All modules (Properties, Tenants, Leases, Maintenance):
- Secured by: Multi-Tenant Architecture
- Part of: Backend Stack
- Implemented with: BaseSupabaseRepository

### Infrastructure Triangle
Production Environment connects:
- Railway (backend hosting)
- Vercel (frontend hosting)
- Supabase (database/auth)

### Documentation Hub: CLAUDE.md
Documents/tracks 6 entities:
- TenantFlow project
- Supabase Migration
- Test Suite status
- Turbopack requirement
- Turborepo configuration
- Technical Debt

### Technical Debt Connections
- Affects: Test Suite (33% failure rate)
- Includes: Supabase Migration
- Tracked in: CLAUDE.md

## Key Insights from Graph

1. **Turbopack is Critical**: The graph shows Turbopack as a central requirement connecting React 19, Next.js 15, Frontend Stack, and Development Workflow.

2. **Supabase Migration is Central**: Connected to multiple entities showing ongoing architectural transformation.

3. **Multi-Tenant Architecture is Pervasive**: Connects to Supabase, BaseCrudService, and all business modules.

4. **Strong Documentation Integration**: CLAUDE.md serves as a documentation hub with 6 direct connections.

5. **Clear Separation of Concerns**: Frontend Stack and Backend Stack are distinct but both connect to TenantFlow.

6. **Test Suite is Isolated**: Only connects to TenantFlow, Frontend Stack, Technical Debt, and CLAUDE.md - indicating testing needs more integration.

## Graph Health
- **Well-connected**: Average 5.3 connections per entity
- **No orphans**: All entities have at least 2 connections
- **Central documentation**: CLAUDE.md acts as knowledge anchor
- **Clear architecture layers**: Frontend/Backend/Infrastructure properly separated

Last Updated: January 17, 2025