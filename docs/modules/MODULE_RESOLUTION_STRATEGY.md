# TypeScript Module Resolution Strategy Documentation

This document explains the intentional module resolution strategies used across the TenantFlow monorepo and the reasoning behind each configuration.

## Overview

TenantFlow uses **different module resolution strategies** for different parts of the system based on their runtime environments and consumption patterns. This is **intentional and necessary** for optimal compatibility.

## Module Resolution Strategies by Package

### 1. Frontend App (`apps/frontend`) - **BUNDLER RESOLUTION**

**Strategy**: `"moduleResolution": "Bundler"`  
**Why**: Consumed by Vite bundler for modern frontend development

**Benefits**:
- Advanced import resolution features (import maps, conditional exports)
- TypeScript file imports with proper bundler handling
- Optimal tree-shaking and code splitting
- Hot module replacement (HMR) compatibility

**File**: `apps/frontend/tsconfig.json` extends `@repo/typescript-config/react.json`

### 2. Backend App (`apps/backend`) - **NODE RESOLUTION**

**Strategy**: `"moduleResolution": "node"`  
**Why**: Executed directly by Node.js runtime with NestJS framework

**Benefits**:
- Traditional Node.js module resolution for CommonJS compatibility
- Decorator metadata support required by NestJS dependency injection
- Direct execution without bundling step
- Standard `node_modules` traversal and package.json main/exports

**File**: `apps/backend/tsconfig.json` extends `@repo/typescript-config/nestjs.json`

### 3. Database Package (`packages/database`) - **NODE RESOLUTION**

**Strategy**: `"moduleResolution": "node"`  
**Why**: Consumed by Node.js backend, contains Prisma client

**Benefits**:
- CommonJS compatibility for Node.js backend consumption
- Proper handling of Prisma generated client
- Traditional module resolution for database operations

**File**: `packages/database/tsconfig.json` extends `@repo/typescript-config/node-library.json`

### 4. Shared Package (`packages/shared`) - **BUNDLER RESOLUTION**

**Strategy**: `"moduleResolution": "Bundler"` with `"module": "ESNext"`  
**Why**: Dual compatibility - consumed by both frontend bundler and Node.js backend

**Benefits**:
- Emits ES modules for frontend bundler compatibility
- Package.json `"type": "module"` with dual exports enables Node.js consumption
- Vite can properly resolve ES module imports
- Backend can consume through package.json exports mapping

**File**: `packages/shared/tsconfig.json` extends `@repo/typescript-config/library.json`

## Configuration Hierarchy

```
base.json (defaults to Bundler - modern TypeScript 5.x default)
├── react.json (Frontend - keeps Bundler)
├── nestjs.json (Backend - overrides to Node)
├── library.json (Frontend libs - keeps Bundler + ESNext)
└── node-library.json (Backend libs - overrides to Node + CommonJS)
```

## Key Architectural Decisions

### Why Different Strategies Are Required

1. **Frontend Needs Bundler Resolution**:
   - Vite requires bundler-compatible module resolution
   - Enables advanced import features and code splitting
   - Handles TypeScript imports correctly during development

2. **Backend Needs Node Resolution**:
   - NestJS decorators require traditional CommonJS/Node resolution
   - Direct execution without bundling step
   - Proper `require()` semantics for npm packages

3. **Shared Package Compromise**:
   - Must work in both environments
   - ES modules satisfy bundler requirements
   - Package.json dual exports handle Node.js compatibility

### Critical Issue Resolved

**Problem**: The shared package was previously using node resolution and emitting CommonJS (`exports.PLANS`), but Vite expected ES modules (`export const PLANS`).

**Solution**: Changed shared package to use bundler resolution with ESNext module output, while maintaining Node.js compatibility through package.json exports.

## Package.json Compatibility

The shared package uses these exports to support both environments:

```json
{
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "default": "./dist/index.js"
    }
  }
}
```

## Testing the Configuration

To verify all module resolution strategies work correctly:

```bash
# Test individual packages
npm run typecheck --workspace=@repo/shared
npm run typecheck --workspace=@repo/database
npm run typecheck --workspace=@repo/backend
npm run typecheck --workspace=@repo/frontend

# Test full build
npm run build
```

## Do Not Change Unless...

These module resolution strategies are carefully chosen for compatibility. **Only change them if**:

1. **Frontend**: Switching from Vite to a different bundler
2. **Backend**: Moving away from NestJS or changing to ES modules
3. **Database**: Changing how Prisma client is consumed
4. **Shared**: Dropping support for either frontend or backend

## Common Issues and Solutions

### Issue: "X is not exported by Y" in Frontend Build
**Cause**: Shared package emitting CommonJS instead of ES modules  
**Solution**: Ensure shared package uses bundler resolution with ESNext modules

### Issue: Decorator Metadata Not Working in Backend
**Cause**: Using bundler resolution instead of node resolution in backend  
**Solution**: Ensure backend and its dependencies use node resolution

### Issue: Cannot Resolve Package Imports
**Cause**: Mismatched module resolution between consuming and consumed packages  
**Solution**: Align resolution strategies based on runtime environment

## Summary

This multi-strategy approach enables:
- ✅ Modern frontend development with Vite
- ✅ Traditional NestJS backend with decorators
- ✅ Dual compatibility for shared code
- ✅ Optimal build performance and runtime compatibility

The intentional use of different module resolution strategies is a **feature, not a bug** - it enables each part of the system to use the most appropriate resolution for its environment.