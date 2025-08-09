# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current Status

**Branch**: `fix-react-children-and-lint-errors`
**Production**: Backend at api.tenantflow.app, Frontend on Vercel  
**Active Work**: TypeScript config fixes, build system optimization, React.Children error resolution

## 🚨 CRITICAL: React 19 + Next.js 15 Compatibility

**MUST USE TURBOPACK**: The frontend REQUIRES Turbopack bundler instead of webpack to avoid the `originalFactory.call` runtime error with React 19 and Next.js 15. The development server is configured to use `--turbo` flag automatically.

**Known Issue Fixed**: The webpack bundler has compatibility issues with React 19's module system causing "undefined is not an object (evaluating 'originalFactory.call')" errors. This is resolved by using Turbopack.

## Tech Stack & Architecture

TenantFlow is a production-ready multi-tenant SaaS property management platform with enterprise-grade architecture:

- **Frontend**: React 19 + Next.js 15 + Turbopack (REQUIRED) + Zustand + TypeScript (59,174 lines)
- **Backend**: NestJS + Fastify + Prisma + PostgreSQL (38,710 lines, 20% test coverage)
- **Auth**: Supabase Auth + JWT + Row-Level Security (RLS)
- **Payments**: Stripe subscriptions + webhooks (platform billing only)
- **Infrastructure**: Turborepo monorepo, Vercel frontend, custom backend hosting

## Essential Commands

**Development**: `npm run dev` starts all apps with Turbopack (REQUIRED for React 19 compatibility), `npm run claude:check` auto-fixes lint/type errors (ALWAYS run before commit)

**Pre-Deployment Testing**: 
- `npm run deploy:test` validates backend before Railway deployment
- `npm run deploy:test:full` comprehensive validation
- `npm run deploy:test:docker` Docker build test (builds `tenantflow-backend` image)

**Testing**: `npm run test` for all tests, `npm run test:e2e` for Playwright, `cd apps/frontend && npm run test:unit:watch` for frontend test watch

**Database**: `npm run db:generate` for Prisma client, `npm run db:migrate` for migrations, `npm run db:studio` for database GUI

**Build**: `npm run build` for all packages, `npm run build:frontend` and `npm run build:backend` for individual apps

## Implemented Features (Production Ready)

### ✅ Core Platform Infrastructure
- **Multi-tenant RLS**: Complete database-level tenant isolation with JWT claims injection
- **BaseCrudService Pattern**: Unified service layer eliminating 680+ lines of duplicated CRUD code
- **Enterprise Authentication**: Supabase Auth + JWT with MFA support and security audit logging
- **Payment Infrastructure**: Complete Stripe integration for platform subscriptions and billing
- **Performance Monitoring**: Comprehensive metrics, health checks, and diagnostic tools

### ✅ Property Management Core
- **Properties CRUD**: Full property lifecycle with document management and image uploads
- **Tenants Management**: Complete tenant lifecycle with lease associations and communication tracking
- **Units Management**: Occupancy status, maintenance scheduling, and rent tracking capabilities
- **Leases Management**: Basic lease CRUD with document generation and expiration tracking
- **Maintenance Requests**: Basic CRUD operations for maintenance request tracking

### ✅ Frontend Architecture
- **Modern React 19**: Full concurrent features with useTransition, useOptimistic, and Suspense
- **File-based Routing**: TanStack Router with authentication contexts (_authenticated, _public, _tenant-portal)
- **State Management**: Modular Zustand stores with persistence and real-time synchronization
- **Component System**: Radix UI foundation with comprehensive error boundaries and accessibility
- **Performance Optimized**: Route-based code splitting, React Query caching, edge optimization

### ✅ Development Experience
- **Type Safety**: End-to-end TypeScript with shared types package
- **Quality Tooling**: ESLint, Prettier, Vitest, Playwright with comprehensive CI/CD
- **Monorepo Architecture**: Turborepo with optimized caching and build dependencies
- **Documentation**: Comprehensive inline documentation and architectural decision records

## Major Architectural Implementations

### BaseCrudService Revolution
Unified service pattern providing:
- Multi-tenant security with automatic ownership validation
- Built-in rate limiting (100 reads/min, 10 writes/min)
- Type-safe generic abstractions across all business entities
- Centralized error handling with retry mechanisms
- Performance monitoring and audit logging

### Multi-Tenant Row-Level Security
Enterprise-grade security with:
- Prisma client pooling with separate admin (BYPASSRLS) and tenant-scoped connections
- Dynamic JWT claims injection for database-level tenant isolation
- Connection pool management (max 10 concurrent, 5-min TTL)
- Multiple security validation layers preventing data leakage

### Frontend Performance Strategy
Production-optimized with:
- Smart Vite chunk splitting (React kept in main bundle to prevent Children errors)
- Route-based lazy loading and preloading strategies
- React Query 5-min stale time with background refetching
- Image optimization and asset inlining for edge caching

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

- **Prisma Client Error**: Run `npm run db:generate` from root
- **Type Errors**: Build shared package first with `npm run build --filter=@repo/shared`
- **Port Conflicts**: Use `npm run dev:clean` in frontend to kill existing processes
- **React.Children Errors**: Keep React in main bundle (configured in vite.config.ts)
- **Auth System Unavailable**: Ensure JwtAuthGuard is properly provided in AuthModule

## Deployment Architecture

- **Frontend**: Vercel with automatic deployment on main branch, requires all NEXT_PUBLIC_* environment variables
- **Backend**: Railway deployment (Project: `tenantflow`, Service: `tenantflow-backend`) at api.tenantflow.app
  - Docker container built from root Dockerfile
  - Health checks at `/health` endpoint
  - Auto-deployment on main branch
- **Database**: Supabase with Prisma Accelerate for connection pooling and edge caching
- **Monitoring**: Comprehensive logging, error tracking, and performance monitoring

## Testing Strategy

Multi-layered approach:
- **Unit**: Vitest with React Testing Library for components and services
- **Integration**: Supertest for API endpoints with database isolation
- **E2E**: Playwright with visual regression testing for critical user journeys
- **Performance**: Bundle analysis and load testing capabilities

---

## Outstanding Work & GitHub Issues

### 🚨 HIGH PRIORITY - Core Business Features

#### **Tenant Rent Payment System** (Issue #90) - CRITICAL
*Consolidates issues #5-#22*
- **Missing**: Complete rent collection system for landlord revenue
- **Scope**: Payment processing, ACH/card support, recurring payments, financial analytics
- **Impact**: Core revenue feature for property managers
- **Dependencies**: Extend existing Stripe integration

#### **Maintenance Request System** (Issue #91) - HIGH
*Consolidates issues #36, #37, #43, #77*
- **Missing**: Work order management, vendor assignment, cost tracking
- **Current**: Basic CRUD only, needs full workflow system
- **Features**: Priority levels, status tracking, statistics, recurring maintenance

#### **Notification System** (Issue #92) - HIGH  
*Consolidates issues #33, #34, #35, #38*
- **Missing**: Email automation, in-app notifications, rent reminders
- **Current**: EmailService exists but no notification orchestration
- **Features**: Payment failure alerts, rent due reminders, maintenance updates

#### **Tenant Portal Integration** (Issue #39) - HIGH
- **Missing**: Tenant dashboard API, maintenance request submission
- **Current**: Frontend exists but backend APIs throw errors
- **Impact**: Tenant user experience completely broken

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

**Codebase Size**: 97,884 total lines
- Backend: 38,710 lines (20% tests)
- Frontend: 59,174 lines (400 files)

**Open Issues**: 17 consolidated issues (from 40+ individual tasks)
**Active PR**: #132 (Monorepo configuration alignment)
**Production Status**: Core platform functional, missing key business features

### 🎯 RECOMMENDED WORK ORDER

1. **Rent Payment System** (#90) - Core revenue feature
2. **Tenant Portal APIs** (#39) - Fix broken user experience  
3. **Notification System** (#92) - Essential for user engagement
4. **Maintenance Workflow** (#91) - Complete business process
5. **Security Hardening** (#94) - Production readiness
6. **Performance & Testing** (#95, #96) - Scale preparation

The platform has solid technical foundations but needs core business features to be production-complete for property management workflows.