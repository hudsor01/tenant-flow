# TenantFlow - Modern Property Management SaaS

A production-ready, multi-tenant property management platform built with React 19, NestJS, and Supabase.

## [UPDATE] Recent Major Updates

**Railway Backend API Fix** - Debugging routing issue where all endpoints except /health return 404

### UI/UX Architecture Cleanup (December 2024)

- **Eliminated 680+ lines of duplicate code** through architectural improvements
- **Single API Layer**: Removed dual-layer API access pattern (direct Supabase + backend API)
- **Component Consolidation**: Removed all enhanced/optimized/fixed duplicate components
- **Type Safety**: Migrated from SupabaseTableData to proper shared types
- **React 19 Alignment**: One component per responsibility following official React patterns

See [CLAUDE.md](./CLAUDE.md#uiux-architecture-cleanup-december-2024) for detailed migration guide.

### Turborepo Best Practices Implementation

This document outlines the Turborepo best practices that have been implemented in the TenantFlow project.

## [TECH] Tech Stack

- **Frontend**: React 19 + Next.js + Zustand + TypeScript
- **Backend**: NestJS + Express + PostgreSQL (Supabase)
- **Infrastructure**: Turborepo monorepo, Railway (project: tenantflow, service: tenantflow-backend), Vercel (frontend)
- **Auth**: Supabase Auth with JWT + Row-Level Security (RLS)
- **Payments**: Stripe subscriptions with webhook processing

## [STRUCTURE] Project Structure

```
apps/
├── frontend/          # React 19 App with Next.js
├── backend/           # NestJS API server
packages/
├── shared/            # Shared TypeScript types
├── config/            # Shared configuration
├── utils/             # Shared utilities
```

## [ENVIRONMENT] Environment Variables

TenantFlow uses Doppler as the single source of truth for all environment variables across all environments.

**DO NOT create or commit `.env` files.** All configuration is managed through Doppler.

### Development Setup

```bash
# Install Doppler CLI
npm install -g @doppler/cli

# Login and configure project
doppler login
doppler setup --project tenantflow

# Run development with Doppler environment
doppler run -- npm run dev
```

### Required Variables

See [docs/environment-management.md](./docs/environment-management.md) for complete list of required environment variables.

## [DEVELOPMENT] Development

```bash
# Install dependencies
npm install

# Start development servers with Doppler
doppler run -- npm run dev

# Run quality checks before committing
npm run claude:check

# Build for production
npm run build
```

See [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines.

## [DATABASE] Database Migrations

**CRITICAL**: Always use official Supabase CLI for migrations. Never manually create migration files.

```bash
# Create new migration (generates unique timestamp automatically)
npm run db:migration:new "descriptive_name"

# Test migrations locally
npm run db:reset

# Deploy to production
npm run db:push

# Check migration status
npm run db:migration:list
```

See **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** for complete migration workflow and CLAUDE.md compliance rules.

## [DOCUMENTATION] Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Development guidelines and architecture decisions
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Official Supabase migration workflow
- **[apps/backend/README.md](./apps/backend/README.md)** - Backend-specific documentation
- **[apps/frontend/README.md](./apps/frontend/README.md)** - Frontend-specific documentation

---

## Turborepo Configuration Details

### 1. Enhanced turbo.json Configuration

- **UI Mode**: Set to `tui` for better development experience
- **Environment Variables**:
    - Added `envMode: "strict"` for explicit environment variable handling
    - Using wildcards (`NEXT_PUBLIC_*`, `STRIPE_*`, etc.) for better caching
    - Added `passThroughEnv` for cloud provider variables
- **Global Dependencies**: Added `**/.env.*` to invalidate cache on env changes
- **Optimized Inputs/Outputs**: Using `$TURBO_DEFAULT for better defaults

### 2. ESLint Integration

- Installed `eslint-plugin-turbo`
- Added turbo plugin to ESLint configs for both frontend and backend
- This catches undeclared environment variables at lint time

### 3. VS Code Integration

- Enhanced `.vscode/settings.json` with Turborepo-specific configs
- Added JSON schema for `turbo.json` IntelliSense
- Configured search exclusions for turbo cache directories
- File nesting patterns for cleaner file explorer
- Updated recommended extensions

### 4. Performance Optimizations

- Better cache configuration with proper inputs/outputs
- Environment variable wildcards reduce cache misses
- Persistent tasks properly configured for dev servers
- Added cache-friendly task dependencies

## [DOCUMENTATION] Additional Resources

- [Turborepo Docs](https://turbo.build/repo/docs)
- [Environment Variables Guide](https://turbo.build/repo/docs/crafting-your-repository/using-environment-variables)
- [Code Generation Guide](https://turbo.build/repo/docs/guides/generating-code)# Railway deployment trigger Mon Aug 11 19:34:14 CDT 2025

# Trigger Railway deployment
