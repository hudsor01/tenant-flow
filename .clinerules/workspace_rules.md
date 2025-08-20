# TenantFlow Workspace Rules

## Security Rules

### 🔒 Enforce RLS (Row Level Security)
- **Rule**: All database queries must use RLS policies with org_id filtering
- **Pattern**: `org_id = auth.jwt() ->> 'org_id'`
- **Severity**: 🚨 Error
- **Check Files**: `**/*.sql`, `**/repositories/*.ts`, `**/services/*.ts`

### 🔑 No Hardcoded Secrets
- **Rule**: Never hardcode API keys, tokens, or sensitive data
- **Forbidden**: `sk_`, `pk_`, `password`, `secret`
- **Severity**: 🚨 Error
- **Check Files**: `**/*.ts`, `**/*.tsx`, `**/*.js`, `**/*.jsx`

### 🛡️ Validate Inputs
- **Rule**: Use Zod schemas for all user inputs
- **Required**: `z.object`
- **Severity**: ⚠️ Warning
- **Check Files**: `**/controllers/*.ts`, `**/api/*.ts`

## Architecture Rules

### 🖥️ Server Components First
- **Rule**: Default to server components, minimize 'use client'
- **Pattern**: `'use client'`
- **Max Usage**: 30% of components
- **Severity**: ⚠️ Warning
- **Check Files**: `apps/frontend/src/**/*.tsx`

### 🏗️ Extend BaseCrud
- **Rule**: All CRUD services must extend BaseCrudService
- **Required**: `extends BaseCrudService`
- **Severity**: 🚨 Error
- **Check Files**: `**/services/*.ts`

### 📦 Use Shared Types
- **Rule**: Import types from packages/shared instead of defining duplicates
- **Preferred Import**: `from '@repo/shared'`
- **Severity**: ⚠️ Warning
- **Check Files**: `**/*.ts`, `**/*.tsx`

## Code Quality Rules

### 🔍 Strict TypeScript
- **Rule**: No any types allowed, use proper TypeScript definitions
- **Forbidden**: `: any`, ` any `, `<any>`, `as any`
- **Severity**: 🚨 Error
- **Check Files**: `**/*.ts`, `**/*.tsx`

### 🧪 No Skip Tests
- **Rule**: Do not skip tests without explicit reason
- **Forbidden**: `.skip(`, `.only(`, `x.describe`, `x.it`
- **Severity**: ⚠️ Warning
- **Check Files**: `**/*.test.ts`, `**/*.spec.ts`

### 📊 Prefer Const Assertions
- **Rule**: Use const assertions for immutable data
- **Pattern**: `as const`
- **Severity**: ℹ️ Info
- **Check Files**: `**/constants/*.ts`, `**/config/*.ts`

## Performance Rules

### ⚡ Lazy Load Components
- **Rule**: Use dynamic imports for large components
- **Pattern**: `dynamic(() => import`
- **Severity**: ℹ️ Info
- **Check Files**: `apps/frontend/src/**/*.tsx`

### 🖼️ Optimize Images
- **Rule**: Use Next.js Image component for images
- **Required**: `from 'next/image'`
- **Forbidden**: `<img`
- **Severity**: ⚠️ Warning
- **Check Files**: `apps/frontend/src/**/*.tsx`

## Testing Rules

### 🧪 Unit Test Coverage
- **Rule**: All services require unit tests
- **Pattern**: `*.service.ts`
- **Requires Test**: `*.service.test.ts`
- **Severity**: ⚠️ Warning
- **Check Files**: `**/services/*.ts`

### 🎭 E2E for Critical Flows
- **Rule**: Critical user flows require E2E tests
- **Critical Flows**: auth, payment, signup, property-creation
- **Severity**: 🚨 Error
- **Check Files**: `tests/e2e/**/*.spec.ts`

## Enforcements

### Pre-Commit
- **Commands**: `npm run claude:check`
- **Block on Failure**: ✅ Yes
- **Required Checks**: lint, typecheck, test:unit

### Pre-Merge
- **Commands**: `npm run ci:full`
- **Required Approvals**: 1
- **Required Checks**: build, test:e2e

### Deployment
- **Staging Checks**: `npm run build`, `npm run test`
- **Production Checks**: `npm run deploy:test`
- **Rollback on Failure**: ✅ Yes

## Exemptions

### Legacy Files
- **Description**: Legacy files during migration
- **Files**: `**/prisma/**`, `**/legacy/**`
- **Exempt Rules**: extendBaseCrud, useSharedTypes
- **Expiry Date**: 2025-03-01

### Test Files
- **Description**: Test files have relaxed type requirements
- **Files**: `**/*.test.ts`, `**/*.spec.ts`, `**/test/**`
- **Exempt Rules**: strictTypeScript
- **Permanent**: ✅ Yes

### Config Files
- **Description**: Configuration files may need any types
- **Files**: `*.config.ts`, `*.config.js`
- **Exempt Rules**: strictTypeScript
- **Permanent**: ✅ Yes

## Auto Fixes

### Format Settings
- ✅ Format on save
- ✅ Organize imports
- ✅ Remove unused imports

### Import Path Updates
- **Enabled**: ✅ Yes
- **Preferred Paths**:
  - `@repo/shared` → `packages/shared/src`
  - `@repo/database` → `packages/database/src`

## Monitoring

### Tracking
- ✅ Track rule violations
- ✅ Report frequency: Weekly
- ✅ Alert on critical violations
- ✅ Exemption usage tracking

## Education

### Learning Support
- ✅ Show rule explanations
- ✅ Suggest best practices
- ✅ Link to documentation
- ✅ Provide examples

---

*These rules ensure code quality, security, and consistency across the TenantFlow monorepo while supporting the multi-tenant architecture and modern tech stack.*