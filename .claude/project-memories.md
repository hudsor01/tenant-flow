# TenantFlow Project Memories

# TenantFlow is a production SaaS property management platform running at api.tenantflow.app (backend) and tenantflow.app (frontend)

# The project uses React 19.1.1 + Next.js 15.4.6 and REQUIRES Turbopack bundler (--turbo flag) to avoid React 19 compatibility issues

# Backend architecture: NestJS 11.1.6 + Fastify + PostgreSQL via Supabase with BaseSupabaseRepository pattern replacing Prisma

# Multi-tenant security through Supabase RLS policies with JWT claims injection for organization-level data isolation

# Current test status: 10 out of 30 frontend test suites failing (33% failure rate) - immediate priority for stabilization

# Essential developer commands: npm run dev (starts with Turbopack), npm run claude:check (auto-fixes lint/type errors)

# Active migration from Prisma to direct Supabase integration - repositories completed for Properties, Tenants, Units, Leases, Maintenance

# State management stack: Zustand 5.0.7 + TanStack Query 5.85.3 + Jotai 2.13.1 for optimal React 19 performance

# Deployment infrastructure: Vercel for frontend, Railway for backend, Supabase for database with RLS enabled

# Node.js 22+ and npm 10+ are required dependencies for the monorepo managed by Turborepo 2.5.6

# Critical architectural rule: Frontend NEVER queries Supabase directly - all data access through backend API endpoints

# Stripe 18.4.0 integrated for payments with comprehensive webhook infrastructure ready for tenant payment features

# Current branch: feature/request-utils-composition-and-hardening with ongoing component architecture refactoring

# UI component library: Radix UI primitives + Tailwind CSS 4.1.12 + React Hook Form 7.62.0 for forms

# CLAUDE.md file contains all project guidelines and is the source of truth for development practices - updated January 17, 2025