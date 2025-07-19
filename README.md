# Turborepo Best Practices Implementation

This document outlines the Turborepo best practices that have been implemented in the TenantFlow project.

## 🚀 What's Been Updated

### 1. Enhanced turbo.json Configuration
- **UI Mode**: Set to `tui` for better development experience
- **Environment Variables**: 
  - Added `envMode: "strict"` for explicit environment variable handling
  - Using wildcards (`VITE_*`, `STRIPE_*`, etc.) for better caching
  - Added `passThroughEnv` for cloud provider variables
- **Global Dependencies**: Added `**/.env.*` to invalidate cache on env changes
- **Optimized Inputs/Outputs**: Using `$TURBO_DEFAULT$` for better defaults
- **New Tasks**: Added `prisma:studio`, `format`, and `format:check`

### 2. ESLint Integration
- Installed `eslint-plugin-turbo` 
- Added turbo plugin to ESLint configs for both frontend and backend
- This catches undeclared environment variables at lint time

### 3. Code Generation (Turbo Generators)
- Created `/turbo/generators` directory with templates
- Available generators:
  - `npm run gen:component` - Generate React components
  - `npm run gen:module` - Generate NestJS modules  
  - `npm run gen:type` - Generate shared TypeScript types
- Templates include proper patterns and best practices

### 4. VS Code Integration
- Enhanced `.vscode/settings.json` with Turborepo-specific configs
- Added JSON schema for `turbo.json` IntelliSense
- Configured search exclusions for turbo cache directories
- File nesting patterns for cleaner file explorer
- Updated recommended extensions

### 5. Performance Optimizations
- Better cache configuration with proper inputs/outputs
- Environment variable wildcards reduce cache misses
- Persistent tasks properly configured for dev servers
- Added cache-friendly task dependencies

## 📋 Usage Guide

### Running Tasks
```bash
# Development
npm run dev          # Start all dev servers
npm run build        # Build all packages
npm run typecheck    # Type check all packages
npm run lint         # Lint all packages
npm run test:all     # Run all tests

# Code Generation
npm run generate     # Interactive generator menu
npm run gen:component # Generate a React component
npm run gen:module   # Generate a NestJS module
npm run gen:type     # Generate a TypeScript type

# Utilities
npm run clean        # Clean all build outputs
npm run format       # Format all code
npm run prisma:studio # Open Prisma Studio
```

### Environment Variables
The project now uses strict environment variable mode. All environment variables must be declared in `turbo.json`:
- In the `env` array for specific tasks
- In `globalEnv` for all tasks
- Using wildcards (e.g., `VITE_*`) for groups

### Using Code Generators

#### Generate a React Component:
```bash
npm run gen:component
# Follow prompts to create component with optional hook and tests
```

#### Generate a NestJS Module:
```bash
npm run gen:module
# Creates module, controller, service, and TRPC router
```

#### Generate a Shared Type:
```bash
npm run gen:type
# Creates type definition in the appropriate location
```

### Remote Caching
To enable remote caching:
```bash
npx turbo login
npx turbo link
```

## 🔍 Debugging Tips

### View Task Graph
```bash
turbo run build --graph
```

### Run Without Cache
```bash
turbo run build --force
```

### Inspect Cache
```bash
turbo run build --dry-run
```

### Check Environment Variables
The ESLint plugin will warn about undeclared environment variables. Run:
```bash
npm run lint
```

## 📚 Additional Resources
- [Turborepo Docs](https://turbo.build/repo/docs)
- [Environment Variables Guide](https://turbo.build/repo/docs/crafting-your-repository/using-environment-variables)
- [Code Generation Guide](https://turbo.build/repo/docs/guides/generating-code)