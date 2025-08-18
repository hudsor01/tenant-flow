# CLAUDE.md - TenantFlow Development Guide

## DO NOT REMOVE THE BELOW CLI COMMAND - BACKEND DEV DEPLOYMENT SIMULATION
docker buildx build --platform linux/amd64 -t tenant-flow-test . --no-cache

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
- **Stack**: React 19.1 + Next.js 15.4 + NestJS 11.1 + Supabase + Stripe
- **Issues**: 10 failing frontend tests, low backend coverage

## ⚠️ Critical Rules
1. **Turbopack Required**: React 19 breaks with webpack
2. **No Direct DB Access**: Frontend→Backend API→Supabase only
3. **Use BaseCrudService**: All CRUD extends this pattern
4. **Multi-tenant RLS**: Auto-filters by org_id
5. **Server Components Default**: Client components minimal

## 🏗 Architecture
```
Frontend (Vercel)         Backend (Railway)
├─ Next.js 15 + React 19  ├─ NestJS + Fastify
├─ Turbopack bundler      ├─ Supabase repositories
├─ Zustand + TanStack     ├─ BaseCrudService pattern
└─ Radix UI + Tailwind    └─ JWT + RLS security
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

## 🔥 Common Fixes
- **Type errors**: `npm run claude:check`
- **Port conflicts**: `npm run dev:clean`
- **Memory issues**: Backend needs 4-8GB for TypeScript
- **Test failures**: 10 frontend suites failing

## 🎯 Priority Work
1. Fix 10 failing frontend tests
2. Complete Supabase migration (remove Prisma)
3. Implement tenant payment flow (#90)
4. Add notification automation (#92)

## 📦 Key Dependencies
- Node 22+, npm 10+
- React 19.1.1, Next.js 15.4.6
- NestJS 11.1.6, Fastify 11.x
- Supabase 2.55.0, Stripe 18.4.0
- Turborepo 2.5.6 monorepo

## 🔗 Endpoints
- Frontend: tenantflow.app
- Backend: api.tenantflow.app
- Health: api.tenantflow.app/health

## 💡 Best Practices
- Always run `npm run claude:check` before commits
- Use Turbopack (`npm run dev` auto-configured)
- Follow existing patterns in codebase
- Check neighboring files for conventions
- Never commit secrets/keys