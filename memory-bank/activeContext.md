# TenantFlow Active Context

## Current Development Focus

### Immediate Priorities (This Sprint)

#### 🔥 Critical Issues - Must Fix Now
1. **10 Failing Frontend Test Suites** ⚠️ BLOCKING
   - React 19 compatibility issues with test patterns
   - Import path updates needed for shared types
   - Mock data structure mismatches with current schema
   - Impact: Blocks CI/CD pipeline and deployment confidence
   - Estimated: 1-2 days systematic fixing

2. **Supabase Migration Completion** 🚀 HIGH PRIORITY
   - Remove remaining Prisma dependencies from backend
   - Migrate all services to BaseCrudService pattern
   - Implement comprehensive RLS policies
   - Impact: Architecture consistency and security compliance
   - Estimated: 2-3 days comprehensive migration

### Active Feature Development

#### Tenant Payment Flow Implementation (#90) 💰
- **Status**: In progress, backend integration phase
- **Scope**: Full Stripe subscription management for multi-tenant billing
- **Technical Requirements**:
  - Stripe webhook handling with proper error recovery
  - Multi-tenant billing isolation (org_id scoped)
  - Subscription lifecycle management (create, update, cancel)
  - Payment failure recovery and retry logic
- **Frontend Components**: Billing dashboard, payment methods, subscription management
- **Backend Services**: Stripe integration, subscription management, billing controllers

#### Notification Automation System (#92) 🔔
- **Status**: Planning phase, architecture design
- **Scope**: Automated email and in-app notifications for key events
- **Technical Requirements**:
  - Email service integration (React Email templates)
  - Real-time notifications via Supabase real-time
  - Notification preferences per user/organization
  - Event-driven architecture with proper queuing
- **Key Events**: Lease renewals, payment reminders, maintenance updates, system alerts

### Recent Significant Changes

#### Git Branch Status
- **Current Branch**: `feature/request-utils-composition-and-hardening`
- **Pending Changes**: Request utilities refactoring and error handling improvements
- **Recent Commits**: Vercel deployment fixes, TypeScript configuration updates

#### Architecture Updates
- **React 19 Migration**: Completed upgrade with server-component-first approach
- **Next.js 15**: Updated to latest version with Turbopack integration
- **NestJS 11**: Backend upgraded with Fastify adapter for performance
- **Supabase Integration**: Partial migration from Prisma, RLS policies implemented

#### Infrastructure Changes
- **Vercel Deployment**: Updated build configuration for Turbo dependency graph
- **Railway Backend**: Optimized for NestJS 11 and Fastify performance
- **Supabase Database**: Enhanced RLS policies and type generation

### Technical Debt & Improvements Needed

#### Testing Infrastructure
- **Frontend Test Coverage**: Currently has 10 failing suites, needs React 19 updates
- **Backend Test Coverage**: Below 80% target, needs comprehensive service tests
- **E2E Testing**: Existing Playwright tests need maintenance and expansion
- **Test Performance**: Test suite takes too long, needs optimization

#### Code Quality Issues
- **TypeScript Strictness**: Some legacy code still uses `any` types
- **Import Consistency**: Mixed usage of relative vs shared package imports
- **Error Handling**: Inconsistent error handling patterns across services
- **Documentation**: API documentation needs updates post-Supabase migration

### Deployment & Environment Status

#### Production Environment
- **Frontend**: https://tenantflow.app (Vercel, healthy)
- **Backend**: https://api.tenantflow.app (Railway, healthy)
- **Database**: Supabase managed PostgreSQL (healthy)
- **CDN**: Vercel Edge Network (optimized)

#### Development Workflow
- **Local Development**: `npm run dev` with Turbopack (required for React 19)
- **Pre-commit Validation**: `npm run claude:check` (lint + typecheck + tests)
- **CI/CD**: GitHub Actions with automated testing and deployment
- **Monitoring**: PostHog analytics, Supabase metrics, Vercel analytics

### Team Context & Communication

#### Development Approach
- **Methodology**: Agile with short iterations, continuous deployment
- **Code Review**: All changes require review, automated checks via GitHub Actions
- **Documentation**: Living documentation in codebase, minimal external docs
- **Quality Gates**: All tests must pass, TypeScript must compile, linting must pass

#### Knowledge Sharing
- **Architecture Decisions**: Documented in code comments and CLAUDE.md
- **Patterns**: Consistent patterns enforced via Cline rules and code review
- **Onboarding**: New team members guided through codebase patterns
- **Best Practices**: Evolving practices documented in development workflows

### Next Week Outlook

#### Planned Completions
- ✅ All 10 failing tests fixed and CI pipeline green
- ✅ Supabase migration fully complete, Prisma dependencies removed
- ✅ Payment flow MVP deployed to staging
- ✅ Notification system architecture finalized

#### Risk Factors
- **Test Fixing Complexity**: May uncover deeper React 19 compatibility issues
- **Supabase Migration**: Potential data migration challenges or RLS policy gaps
- **Payment Integration**: Stripe webhook reliability and error handling complexity
- **Performance**: Large dataset handling may require optimization sooner than planned