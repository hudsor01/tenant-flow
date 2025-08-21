# TenantFlow Technology Context

## Core Technology Stack

### Frontend Stack
- **React 19.1.1**: Latest React with server components and concurrent features
- **Next.js 15.4.6**: App Router, server actions, and edge runtime optimization
- **TypeScript 5.9.2**: Strict mode with comprehensive type safety
- **Turbopack**: Development bundler (required for React 19 compatibility)
- **Tailwind CSS**: Utility-first styling with custom design system
- **Radix UI**: Headless components for accessibility and customization

### Backend Stack
- **NestJS 11.1.6**: Enterprise-grade Node.js framework with decorators
- **Fastify 11.x**: High-performance HTTP adapter (replaces Express)
- **TypeScript 5.9.2**: Shared type system with frontend
- **Zod**: Runtime validation and type inference
- **Winston**: Structured logging with multiple transport layers

### Database & Authentication
- **Supabase 2.55.0**: PostgreSQL with real-time subscriptions and RLS
- **Row-Level Security**: Database-level multi-tenant data isolation
- **Supabase Auth**: JWT-based authentication with social login support
- **Real-time**: WebSocket subscriptions for live data updates

### Payment & Billing
- **Stripe 18.4.0**: Payment processing and subscription management
- **Webhook Handling**: Secure webhook processing with retry logic
- **Multi-tenant Billing**: Organization-scoped subscription management

### Development Tools
- **Turborepo 2.5.6**: Monorepo build system with intelligent caching
- **ESLint 8.57.1**: Code linting with TypeScript and React rules
- **Prettier 3.6.2**: Code formatting with team configuration
- **Playwright**: End-to-end testing with visual regression testing
- **Jest**: Unit testing with React Testing Library integration

## Runtime & Deployment

### Node.js Environment
- **Node.js 22+**: Required for optimal React 19 and Next.js 15 support
- **npm 10+**: Package manager with workspaces support
- **Package Manager**: npm 11.5.2 (defined via packageManager field)

### Development Environment
```bash
# Required environment setup
node --version    # 22+
npm --version     # 10+

# Development server (REQUIRED - uses Turbopack)
npm run dev

# Pre-commit validation (REQUIRED before commits)
npm run claude:check
```

### Production Deployment
- **Frontend**: Vercel Edge Network with global CDN
- **Backend**: Railway with auto-scaling and health monitoring
- **Database**: Supabase managed PostgreSQL with automatic backups
- **Monitoring**: PostHog analytics, Vercel Analytics, Supabase Metrics

## Framework-Specific Configurations

### React 19 Configuration
```javascript
// next.config.ts
const nextConfig = {
  experimental: {
    turbo: {
      enabled: true,  // Required for React 19
    },
    reactCompiler: true,
  },
  typescript: {
    strict: true,
  },
}
```

### NestJS 11 Configuration
```typescript
// main.ts
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(), // High-performance adapter
    {
      logger: ['error', 'warn', 'log'],
    }
  )
  
  app.useGlobalGuards(new JwtAuthGuard())
  app.useGlobalPipes(new ValidationPipe())
  
  await app.listen(3001, '0.0.0.0')
}
```

### Turborepo Configuration
```json
// turbo.json
{
  "remoteCache": {
    "enabled": true,
    "signature": true,
    "timeout": 60
  },
  "globalEnv": ["NODE_ENV", "CI", "VERCEL", "GITHUB_ACTIONS"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**", ".turbo/**"]
    }
  }
}
```

## Development Workflow Tools

### Code Quality Pipeline
```bash
# Pre-commit validation (REQUIRED)
npm run claude:check      # Runs lint + typecheck + test:unit

# Individual quality checks
npm run lint             # ESLint with auto-fix
npm run typecheck        # TypeScript compilation
npm run test:unit        # Jest unit tests
npm run test:e2e         # Playwright E2E tests
npm run format           # Prettier formatting
```

### Database Management
```bash
# Supabase type generation (run after schema changes)
npm run update-supabase-types

# Generate types from current database schema
npx supabase gen types typescript \
  --project-id "bshjmbshupiibfiewpxb" \
  --schema public > packages/shared/src/types/supabase-generated.ts
```

### Testing Infrastructure
```bash
# Unit testing with coverage
npm run test:coverage

# E2E testing with visual regression
npm run test:e2e
npm run test:visual:update  # Update visual snapshots

# Test specific files
npm run test:unit -- path/to/test.spec.ts
npm run test:unit -- --watch  # Watch mode for active development
```

## Package Architecture

### Monorepo Workspace Structure
```json
// package.json
{
  "workspaces": ["apps/*", "packages/*"],
  "packageManager": "npm@11.5.2"
}
```

### Shared Packages
- **@repo/shared**: Types, utilities, validation schemas
- **@repo/emails**: React Email templates for notifications
- **@repo/database**: Supabase utilities and type definitions
- **@repo/tailwind-config**: Shared Tailwind configuration
- **@repo/typescript-config**: Shared TypeScript configurations

### Dependency Management
```json
// Key overrides for compatibility
{
  "overrides": {
    "typescript": "5.9.2",
    "esbuild": "^0.25.9",
    "undici": "^7.14.0"
  }
}
```

## Performance Optimizations

### Build Performance
- **Turbopack**: 10x faster development builds vs Webpack
- **Remote Caching**: Turborepo remote cache for CI/CD speed
- **Incremental Builds**: Only rebuild changed packages
- **Parallel Execution**: Concurrent task execution across packages

### Runtime Performance
- **Server Components**: Reduced client-side JavaScript bundle
- **Static Generation**: Pre-rendered pages where possible
- **Edge Runtime**: Vercel Edge Functions for global performance
- **Connection Pooling**: Supabase managed database connections

### Monitoring & Analytics
- **PostHog**: Product analytics and feature flagging
- **Vercel Analytics**: Core Web Vitals and performance metrics
- **Supabase Metrics**: Database performance and query analysis
- **Error Tracking**: Structured error logging with Winston

## Security Configuration

### Environment Variables
```bash
# Required environment variables
NODE_ENV=development
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=eyJ...
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
```

### Security Headers
```typescript
// next.config.ts security headers
const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  }
]
```

### Authentication Configuration
- **JWT Tokens**: Supabase-generated with org_id claims
- **Session Management**: Automatic token refresh
- **CORS**: Configured for production domains only
- **Rate Limiting**: Per-endpoint and per-user limits

## IDE & Development Setup

### Recommended VS Code Extensions
- TypeScript Hero (auto-import organization)
- Prettier (code formatting)
- ESLint (real-time linting)
- Tailwind CSS IntelliSense
- REST Client (API testing)

### Environment Setup Scripts
```bash
# Setup new development environment
npm install              # Install all dependencies
npm run build:shared     # Build shared packages first  
npm run dev             # Start development servers
```

## Migration & Upgrade Strategy

### Current Migration Status
- ✅ React 19: Completed with server components
- ✅ Next.js 15: Upgraded with Turbopack integration
- ✅ NestJS 11: Upgraded with Fastify adapter
- 🔄 Supabase: In progress, removing Prisma dependencies
- 📋 Testing: Updating for React 19 compatibility

### Planned Technology Updates
- **Database**: Complete Supabase migration (remove Prisma)
- **Testing**: React 19 test patterns and utilities
- **Performance**: Edge runtime optimization
- **Security**: Enhanced RLS policies and audit logging