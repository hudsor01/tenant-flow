# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚀 Quick Start for Developers

```bash
# Development (with Turbopack - REQUIRED)
npm run dev

# Fix all lint/type errors automatically
npm run claude:check

# Run tests
npm run test        # All tests
npm run test:unit   # Frontend unit tests
npm run test:e2e    # Playwright E2E tests

# Build
npm run build       # Build all packages
```

## Current Status

**Branch**: `feature/request-utils-composition-and-hardening`
**Production**: ✅ LIVE - Backend at api.tenantflow.app, Frontend at tenantflow.app (Vercel)  
**Active Work**: Component architecture refactoring, test stabilization, performance optimization
**Last Updated**: January 17, 2025

## 🚨 CRITICAL: React 19 + Next.js 15 Compatibility

**MUST USE TURBOPACK**: The frontend REQUIRES Turbopack bundler instead of webpack to avoid the `originalFactory.call` runtime error with React 19 and Next.js 15. The development server is configured to use `--turbo` flag automatically.

**Known Issue Fixed**: The webpack bundler has compatibility issues with React 19's module system causing "undefined is not an object (evaluating 'originalFactory.call')" errors. This is resolved by using Turbopack.

## ⚠️ Current Known Issues

1. **Frontend Tests**: 10 test suites failing (out of 30 total) - needs immediate attention
2. **Backend Test Coverage**: Low coverage, minimal test implementation
3. **Component Architecture**: Migration to Supabase-based repositories in progress
4. **Bundle Size**: Multiple vendor chunks in production build affecting performance
5. **TypeScript Memory**: Backend compilation requires 4-8GB memory allocation
6. **Build Times**: Complex TypeScript setup causing slow build times

## Tech Stack & Architecture

TenantFlow is a production-ready multi-tenant SaaS property management platform with enterprise-grade architecture:

- **Frontend**: React 19.1.1 + Next.js 15.4.6 + Turbopack (REQUIRED) + TypeScript 5.9.2
  - State: Zustand 5.0.7 + TanStack Query 5.85.3 + Jotai 2.13.1
  - UI: Radix UI + Tailwind CSS 4.1.12 + React Hook Form 7.62.0
  - Testing: 30 test suites (10 failing, needs attention)
- **Backend**: NestJS 11.1.6 + Fastify 11.x + PostgreSQL via Supabase
  - Repository Pattern with BaseSupabaseRepository abstraction
  - Multi-tenant RLS with JWT claims injection
  - Comprehensive service layer with BaseCrudService pattern
- **Auth**: Supabase Auth 2.55.0 + JWT + Row-Level Security (RLS)
- **Payments**: Stripe 18.4.0 with comprehensive webhook infrastructure
- **Infrastructure**: Turborepo 2.5.6 monorepo, Vercel frontend, Railway backend
- **Node**: Requires Node.js 22+ and npm 10+

## Essential Commands

**Development**: `npm run dev` starts all apps with Turbopack (REQUIRED for React 19 compatibility), `npm run claude:check` auto-fixes lint/type errors (ALWAYS run before commit)

**Pre-Deployment Testing**: 
- `npm run deploy:test` validates backend before Railway deployment
- `npm run deploy:test:full` comprehensive validation
- `npm run deploy:test:docker` Docker build test (builds `tenantflow-backend` image)

**Testing**: `npm run test` for all tests, `npm run test:e2e` for Playwright, `cd apps/frontend && npm run test:unit:watch` for frontend test watch

**Build**: `npm run build` for all packages, `npm run build:frontend` and `npm run build:backend` for individual apps

## Implemented Features (Production Ready)

### ✅ Core Platform Infrastructure
- **Multi-tenant RLS**: Database-level tenant isolation with JWT claims injection
- **BaseCrudService Pattern**: Unified service layer across all business entities
- **Enterprise Authentication**: Supabase Auth + JWT with MFA support
- **Payment Infrastructure**: Stripe integration with webhook processing
- **Health Monitoring**: Comprehensive health checks at `/health` endpoint (✅ LIVE)

### ✅ API Controllers (32 Implemented)
- **Properties**: Full CRUD + export functionality
- **Tenants**: Complete management with repository pattern
- **Units**: Full lifecycle management
- **Leases**: CRUD with PDF generation capabilities
- **Maintenance**: Request tracking and management
- **Users & Subscriptions**: User management with subscription tiers
- **Billing**: Stripe checkout and webhook handling
- **Documents**: File upload and management
- **Email**: Queue-based email processing with Bull
- **Notifications**: Event-driven notification system

### ✅ Frontend Features
- **Modern React 19**: Concurrent features, Suspense, Server Components
- **Routing**: App Router with proper layouts and loading states
- **State Management**: Zustand + TanStack Query + Jotai
- **Component Library**: Radix UI primitives with Tailwind styling
- **Forms**: React Hook Form + Zod validation
- **Performance**: Turbopack bundler, route-based code splitting

### ✅ Infrastructure & DevOps
- **Monorepo**: Turborepo with optimized task running
- **Type Safety**: End-to-end TypeScript with shared types
- **Testing**: Jest + Vitest + Playwright (needs stabilization)
- **CI/CD**: GitHub Actions with semantic versioning
- **Deployment**: Vercel (frontend) + Railway (backend)

## Major Architectural Implementations

### Repository Pattern with Supabase
Complete migration to Supabase-based repositories:
- BaseSupabaseRepository providing unified data access layer
- Direct Supabase client integration replacing Prisma
- Type-safe operations with Supabase's TypeScript support
- Repositories implemented: Properties, Tenants, Units, Leases, Maintenance

### BaseCrudService Pattern
Unified service pattern providing:
- Multi-tenant security with automatic ownership validation
- Built-in rate limiting and error handling
- Type-safe generic abstractions across all business entities
- Integration with Supabase repositories
- Performance monitoring and audit logging

### Multi-Tenant Row-Level Security
Enterprise-grade security with:
- Supabase RLS policies for database-level tenant isolation
- JWT claims injection for secure multi-tenancy
- Automatic organization filtering in all queries
- Multiple security validation layers

### Frontend Architecture
Production-optimized with:
- Turbopack bundler (required for React 19 compatibility)
- App Router with proper layouts and loading states
- Zustand + TanStack Query for state management
- Server/Client component separation (ongoing refactoring)

## Critical Architectural Rules

1. **No Direct Database Access**: Frontend NEVER queries Supabase directly - always through backend API
2. **BaseCrudService Usage**: All CRUD operations must extend BaseCrudService for consistency and security
3. **Type Safety**: All API contracts use shared types from `@repo/shared` package
4. **Multi-tenancy**: All database queries automatically filtered by organization via RLS
5. **Error Handling**: Use ErrorHandlerService with structured exceptions throughout
6. **🚨 NEXT.JS 15 + REACT 19 COMPONENT ARCHITECTURE** (CRITICAL - CAUSES BUILD FAILURES):
   - **Pages are lightweight server components** - Only import and compose smaller components
   - **Extract ALL interactive logic** into separate client components using 'use client'
   - **Minimize client components** - Only use for state, effects, event handlers, browser APIs
   - **NO massive client components** - Current pages violate this (615+ line client components)
   - **DRY principles** - Reusable components instead of inline repetition
   - **Server components by default** - Better performance, smaller bundles
   - **Proper component composition** - Import focused components rather than inline everything

## Common Issues & Solutions
=
- **Type Errors**: Run `npm run claude:check` to auto-fix lint and type errors
- **Port Conflicts**: Use `npm run dev:clean` in frontend to kill existing processes
- **React.Children Errors**: Keep React in main bundle (configured in vite.config.ts)
- **Auth System Unavailable**: Ensure JwtAuthGuard is properly provided in AuthModule
- **Test Failures**: Frontend has 59 failing tests - use `npm run test:unit` to debug
- **Build Memory**: Backend TypeScript requires high memory allocation (8GB)

## Deployment Architecture

- **Frontend**: Vercel with automatic deployment on main branch, requires all NEXT_PUBLIC_* environment variables
- **Backend**: Railway deployment (Project: `tenantflow`, Service: `tenantflow-backend`) at api.tenantflow.app
  - Docker container built from root Dockerfile
  - Health checks at `/health` endpoint
  - Auto-deployment on main branch
- **Monitoring**: Comprehensive logging, error tracking, and performance monitoring

## Testing Strategy

Multi-layered approach:
- **Unit**: Vitest with React Testing Library for components and services
- **Integration**: Supertest for API endpoints with database isolation
- **E2E**: Playwright with visual regression testing for critical user journeys
- **Performance**: Bundle analysis and load testing capabilities

---

## Outstanding Work & Current Priorities

### 🚨 IMMEDIATE PRIORITIES - Technical Debt

#### **Test Suite Stabilization** - CRITICAL
- **Issue**: 10 failing frontend test suites (33% failure rate)
- **Impact**: Cannot confidently deploy without test validation
- **Action**: Fix test failures, improve coverage for both frontend and backend

#### **Supabase Migration Completion** - HIGH
- **Current**: Repository pattern migration in progress
- **Completed**: Properties, Tenants, Units, Leases, Maintenance repositories
- **Remaining**: Complete removal of Prisma dependencies

#### **Component Architecture Refactoring** - HIGH
- **Issue**: Server/client component separation in Next.js 15
- **Current**: Ongoing refactoring for optimal performance
- **Impact**: Bundle size and performance optimization needed

### 🔧 CORE BUSINESS FEATURES - Next Phase

#### **Tenant Rent Payment System** (Issue #90) - CRITICAL
- **Status**: Stripe infrastructure exists, needs tenant payment flow
- **Scope**: Payment processing, ACH/card support, recurring payments
- **Impact**: Core revenue feature for property managers

#### **Notification Automation** (Issue #92) - HIGH  
- **Status**: Email queue implemented, needs orchestration
- **Features**: Payment reminders, maintenance updates, lease renewals

#### **Tenant Portal Completion** (Issue #39) - HIGH
- **Status**: Frontend exists, backend APIs need implementation
- **Impact**: Tenant self-service capabilities

### 🔧 MEDIUM PRIORITY - System Improvements

#### **Lease Management Enhancement** (Issue #93)
*Consolidates issues #76, #79, #80*
- **Current**: Basic CRUD operations only
- **Missing**: Multi-state templates, digital signatures, PDF generation
- **TypeScript**: Several type compatibility issues need resolution

#### **Security Hardening** (Issue #94)
*Consolidates issues #54, #58, #48*
- **Missing**: CSRF protection, webhook rate limiting
- **Critical**: Remove test authentication bypasses in production
- **Timeline**: Required before scaling

#### **Performance Optimization** (Issue #96)
*Consolidates issues #67, #68, #74, #75*
- **Database**: Add missing indexes, optimize slow queries
- **Monitoring**: Implement APM (Sentry/DataDog)
- **Frontend**: Bundle size monitoring, lazy loading improvements

#### **Testing Coverage** (Issue #95)
*Consolidates issues #61, #71, #72*
- **Current**: 20% backend coverage, minimal frontend testing
- **Target**: 80% backend, 70% frontend coverage
- **Missing**: E2E test scenarios for complete user journeys

#### **Accessibility Compliance** (Issue #97)
*Consolidates issues #65, #66, #69*
- **Missing**: ARIA labels, keyboard navigation, color contrast fixes
- **Standard**: WCAG 2.1 Level AA compliance required
- **Testing**: Screen reader compatibility, automated a11y testing

### 🏗️ FUTURE FEATURES

#### **Advanced Reporting** (Issue #27)
- Custom report builder, advanced charts, business intelligence
- **Status**: Removed during simplification, needs re-implementation

#### **Invoice Management** (Issue #28)  
- Property owner invoicing system (separate from marketing tool)
- **Dependencies**: Payment system integration

#### **Code Quality** (Issue #44)
- Replace console.log statements with proper logging
- **Files**: users.service.ts, subscriptions.router.ts

#### **Auth Improvements** (Issue #32, #41)
- Supabase password updates, OAuth cleanup
- **Impact**: User account management completion

### 📊 PROJECT METRICS

**Codebase Status**:
- Monorepo with 8 packages (apps + shared libraries)
- Frontend: 30 test suites (10 failing - 33% failure rate)
- Backend: Minimal test coverage, needs expansion
- Node.js 22+ required, npm 10+ required

**Production Status**: ✅ LIVE and operational
- Backend: api.tenantflow.app (healthy, uptime verified)
- Frontend: tenantflow.app (Vercel deployment)
- Database: PostgreSQL via Supabase with RLS enabled
- Architecture: Migrating from Prisma to direct Supabase integration

### 🎯 RECOMMENDED WORK ORDER

**Week 1-2: Technical Stabilization**
1. Fix 10 failing frontend test suites
2. Complete Supabase repository migration
3. Improve backend test coverage

**Week 3-4: Architecture & Performance**
1. Complete server/client component separation
2. Bundle size optimization with Turbopack
3. Remove remaining Prisma dependencies

**Month 2: Business Features**
1. Tenant rent payment system (#90)
2. Notification automation (#92)
3. Tenant portal API completion (#39)

**Month 3: Production Hardening**
1. Security audit and fixes (#94)
2. Comprehensive test coverage (target 80% backend, 70% frontend)
3. Performance monitoring and optimization

The platform has **solid technical foundations** and is **currently operational in production**. Focus should be on **completing the Supabase migration**, **stabilizing tests**, and **implementing core business features** for full market readiness.