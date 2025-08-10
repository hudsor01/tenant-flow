# TenantFlow Master Orchestrator Agent

The Master Orchestrator Agent provides end-to-end coordination between frontend and backend components, ensuring full-stack alignment, deployment readiness, and operational excellence.

## 🎯 Purpose

The orchestrator addresses the complexity of coordinating a modern full-stack application by:

- **Validating alignment** between frontend and backend systems
- **Coordinating deployments** across backend and Vercel (frontend)
- **Monitoring cross-service dependencies** and contracts
- **Ensuring security policy consistency** across the stack
- **Orchestrating development workflows** for optimal productivity

## 🚀 Quick Start

```bash
# Validate full-stack alignment
npm run orchestrator:validate

# Start coordinated development environment
npm run orchestrator:dev

# Orchestrate production build
npm run orchestrator:build

# Coordinate deployment
npm run orchestrator:deploy

# Run comprehensive test suite
npm run orchestrator:test

# Start monitoring dashboard
npm run orchestrator:monitor
```

## 📋 Commands

### `validate` - Full-Stack Alignment Validation

Performs comprehensive validation across all system components:

```bash
npm run orchestrator:validate
```

**Validation Areas:**
- **Type Safety**: Ensures shared types are properly used across frontend and backend
- **API Contracts**: Validates that frontend API calls match backend endpoints
- **Authentication**: Checks Supabase auth configuration alignment
- **Database Schema**: Validates Prisma schema status and migrations
- **Environment Config**: Ensures required environment variables are present
- **Security Policies**: Validates CORS, RLS, and JWT configuration alignment

### `dev` - Development Environment Orchestration

Starts all services in a coordinated manner with alignment validation:

```bash
npm run orchestrator:dev
```

**Features:**
- Pre-flight alignment validation
- Coordinated service startup
- Hot reloading coordination
- Cross-service error propagation

### `build` - Build Process Orchestration

Coordinates the build process across all packages:

```bash
npm run orchestrator:build
```

**Build Sequence:**
1. Validates full-stack alignment
2. Builds shared package (types, utilities)
3. Builds backend (NestJS + Fastify)
4. Builds frontend (React + Vite)
5. Validates build artifacts

### `deploy` - Deployment Orchestration

Coordinates deployment across backend hosting and Vercel:

```bash
npm run orchestrator:deploy
```

**Deployment Pipeline:**
1. Full-stack validation
2. Comprehensive test suite
3. Production build
4. Backend deployment to production
5. Frontend deployment to Vercel
6. Post-deployment validation

### `test` - Test Suite Orchestration

Runs comprehensive test suite across all components:

```bash
npm run orchestrator:test
```

**Test Coverage:**
- Unit tests (Vitest)
- Integration tests (Supertest)
- E2E tests (Playwright)
- Visual regression tests
- API contract tests

### `monitor` - Monitoring Orchestration

Starts comprehensive monitoring systems:

```bash
npm run orchestrator:monitor
```

**Monitoring Systems:**
- Performance monitoring
- Deduplication monitoring
- Build optimization monitoring
- Error tracking coordination

## 🔍 Validation Details

### Type Safety Validation

Ensures type consistency across the full stack:

- **Shared Package**: Validates shared types build successfully
- **Frontend Usage**: Checks TypeScript compilation with shared types
- **Backend Usage**: Validates NestJS services use correct types
- **Contract Alignment**: Ensures API contracts match implementations

### API Contract Validation

Validates frontend/backend API compatibility:

- **Route Extraction**: Parses backend controllers for available endpoints
- **Frontend Analysis**: Extracts API calls from frontend code
- **Contract Comparison**: Identifies mismatches between expected and available APIs
- **Version Compatibility**: Ensures API versioning alignment

### Authentication Alignment

Validates Supabase authentication configuration:

- **Configuration Parity**: Ensures frontend and backend auth settings match
- **JWT Validation**: Validates JWT secret consistency
- **RLS Policies**: Checks Row-Level Security policy alignment
- **Session Management**: Validates session handling consistency

### Environment Configuration

Ensures all required environment variables are present:

**Frontend Requirements:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL`

**Backend Requirements:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`

### Security Policy Alignment

Validates security configuration consistency:

- **CORS Configuration**: Ensures proper cross-origin settings
- **JWT Alignment**: Validates token configuration
- **RLS Policies**: Checks database security policies
- **Environment Security**: Validates secure environment handling

## 📊 Reporting

The orchestrator generates comprehensive alignment reports:

```
📊 FULL-STACK ALIGNMENT REPORT
=====================================

🎯 COMPONENT STATUS:
  Frontend: ✅ Ready
  Backend:  ✅ Ready
  Shared:   ✅ Ready

⚠️ ALIGNMENT ISSUES:
  1. Missing environment variable: NEXT_PUBLIC_BACKEND_URL
  2. API contract mismatch: GET /api/properties/stats

🎯 OVERALL STATUS: NEEDS ATTENTION
=====================================
```

## 🛠️ Architecture

### Component Structure

```
TenantFlowOrchestrator
├── Type Safety Validation
├── API Contract Validation
├── Authentication Alignment
├── Database Schema Alignment
├── Environment Configuration
├── Security Policy Alignment
├── Development Orchestration
├── Build Orchestration
├── Deployment Orchestration
├── Test Orchestration
└── Monitoring Orchestration
```

### Integration Points

- **Turborepo**: Leverages existing monorepo structure
- **Backend**: Coordinates production deployment
- **Vercel**: Coordinates frontend deployment
- **Supabase**: Validates authentication and database alignment
- **Stripe**: Ensures payment processing alignment

## 🚨 Common Issues

### Type Misalignment

**Problem**: Frontend and backend using different types
**Solution**: Run `npm run orchestrator:validate` to identify mismatches

### API Contract Drift

**Problem**: Frontend calling non-existent backend endpoints
**Solution**: Orchestrator identifies contract mismatches automatically

### Environment Variable Drift

**Problem**: Missing or mismatched environment variables
**Solution**: Comprehensive environment validation across all services

### Authentication Inconsistency

**Problem**: Frontend and backend auth configuration mismatch
**Solution**: Auth alignment validation ensures consistency

## 🎛️ Configuration

The orchestrator can be customized through environment variables:

```env
# Orchestrator Settings
ORCHESTRATOR_STRICT_MODE=true
ORCHESTRATOR_AUTO_FIX=false
ORCHESTRATOR_REPORT_FORMAT=detailed
```

## 🔄 Integration with Existing Workflows

### Git Hooks

Integrate with pre-commit hooks:

```bash
# .git/hooks/pre-commit
npm run orchestrator:validate
```

### CI/CD Integration

Use in GitHub Actions:

```yaml
- name: Validate Full-Stack Alignment
  run: npm run orchestrator:validate

- name: Orchestrate Deployment
  run: npm run orchestrator:deploy
```

### Development Workflow

Replace individual service starts:

```bash
# Instead of starting services individually
npm run orchestrator:dev
```

## 📈 Benefits

1. **Reduced Integration Issues**: Early detection of misalignment
2. **Faster Development**: Coordinated development environment
3. **Reliable Deployments**: Comprehensive pre-deployment validation
4. **Improved Quality**: Automated cross-service testing
5. **Better Monitoring**: Coordinated observability across the stack

## 🛡️ Security Considerations

- **Environment Validation**: Ensures secure environment handling
- **Authentication Alignment**: Validates security policy consistency
- **CORS Validation**: Ensures proper cross-origin configuration
- **RLS Policy Validation**: Validates database security policies

## 📚 Best Practices

1. **Run validation before major changes**: `npm run orchestrator:validate`
2. **Use coordinated development**: `npm run orchestrator:dev`
3. **Validate before deployment**: Always run full validation
4. **Monitor alignment drift**: Regular validation checks
5. **Keep documentation updated**: Update as system evolves

## 🤝 Contributing

When adding new features:

1. Update validation logic for new components
2. Add new environment variables to validation
3. Update API contract detection
4. Extend monitoring capabilities
5. Update documentation

## 📞 Support

For issues with the orchestrator agent:

1. Check alignment report for specific issues
2. Validate individual components
3. Review environment configuration
4. Check service logs for detailed errors