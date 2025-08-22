# CLAUDE.md - TenantFlow Development Guide

## DO NOT REMOVE THE BELOW CLI COMMAND - BACKEND DEV DEPLOYMENT SIMULATION
docker buildx build --platform linux/amd64 -t tenant-flow-test . --no-cache

This document establishes patterns to prevent over-engineering and maintain the simplified architecture achieved through our refactoring effort.

### DRY, KISS, No-Abstractions
- **DRY**: Only centralize code reused ≥2 places
- **KISS**: Choose the simplest working path with native library usage
- **No New Abstractions**: Do not introduce factories, wrappers, or meta-layers

## 🛠 CLI Tools
```bash
# Better tools (installed via https://github.com/hudsor01/dotfiles)
bat <file>         # syntax highlighting
batgrep <pattern>  # search with colors
batdiff           # prettier diffs
rg <pattern>      # fast grep (ripgrep)
fd <name>         # fast find
eza/lsd           # better ls
z <partial-path>  # smart cd (zoxide)
gg/gitui          # git UI
btop             # system monitor
```

## 🚀 Commands
```bash
npm run dev           # Start w/ Turbopack (REQUIRED for React 19)
npm run claude:check  # Fix lint/types (RUN BEFORE COMMIT)
npm run test         # All tests
npm run build        # Build all
npm run deploy:test  # Pre-deploy validation
```

## 📍 Status
- **Branch**: `feature/request-utils-composition-and-hardening`
- **Prod**: api.tenantflow.app (backend), tenantflow.app (frontend)
- **Stack**: React 19.1 + Next.js 15.4 + NestJS 11.1 + Supabase + Stripe + Fastify
- **Issues**: unable to deploy successfully to either frontend or backend

## ⚠️ Critical Rules
1. **Turbopack Required**: React 19 breaks with webpack
2. **No Direct DB Access**: Frontend→Backend API→Supabase only
3. **Use BaseCrudService**: All CRUD extends this pattern
4. **Multi-tenant RLS**: Auto-filters by org_id
5. **Server Components Default**: Client components minimal

## 🏗 Architecture
```
Frontend (Vercel)         Backend (Railway)
├─ Next.js 15 + React 19    ├─ NestJS + Fastify
├─ Turbopack bundler        ├─ Supabase repositories
├─ Jotai + TanStack         ├─ Native NestJS features
└─ Shadcn/Radix/Tailwind    └─ Supabase Auth + RLS security
```

## 📁 Structure
```
apps/
├─ frontend/         # Next.js app
├─ backend/          # NestJS API
packages/
├─ shared/           # Types & utils
├─ emails/           # Email templates
```

## 📦 Key Dependencies
- Node 22+, npm 10+
- React 19.1.1, Next.js 15.4.6
- NestJS 11.1.6, Fastify 11.x
- Supabase 2.55.0, Stripe 18.4.0
- Turborepo 2.5.6 monorepo
- ESLint 9.x 

## 🔗 Endpoints
- Frontend: tenantflow.app
- Backend: api.tenantflow.app
- Health: api.tenantflow.app/api/v1/health

## 💡 Best Practices
- Never commit secrets/keys