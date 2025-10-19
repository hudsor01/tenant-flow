# TenantFlow Scripts

Utility scripts for development, testing, and maintenance.

## Available Scripts

### 🔍 API Route Audit

**Purpose**: Map frontend API routes to backend endpoints and identify orphaned routes.

```bash
npx tsx scripts/audit-api-routes.ts
```

**What it does**:
- ✅ Shows all connected frontend ↔ backend routes
- ⚠️ Identifies frontend routes without backend endpoints (404 errors)
- ⚠️ Identifies backend endpoints not used by frontend (dead code)

**When to use**:
- After adding new API routes
- Before deployment to catch broken connections
- During refactoring to find unused code
- When debugging 404 errors

**Example output**:
```
🔍 TenantFlow API Route Audit

📱 Analyzing frontend API routes...
   Found 29 frontend API calls

🖥️  Analyzing backend endpoints...
   Found 189 backend endpoints

🔗 Mapping connections...

✓ GET    api/v1/properties/stats
  Frontend: properties.getStats()
  Backend:  properties (apps/backend/src/modules/properties/properties.controller.ts)

⚠️  Orphaned Frontend Routes (no backend endpoint):
   ✗ POST   api/v1/leases/create-calculated
     Source: leases.createLeaseWithFinancialCalculations()

📊 Summary
──────────────────────────────────────────────────
Frontend routes:     29
Backend endpoints:   189
Matched connections: 26
Orphaned frontend:   3
Orphaned backend:    164
──────────────────────────────────────────────────
```

**Integration**:
Add to your workflow:
```bash
# Before committing route changes
pnpm typecheck && npx tsx scripts/audit-api-routes.ts

# Add to package.json
{
  "scripts": {
    "audit:routes": "tsx scripts/audit-api-routes.ts"
  }
}
```

## Future Scripts

Planned additions:
- `scripts/test-api-connectivity.ts` - Live endpoint testing
- `scripts/generate-api-docs.ts` - Auto-generate API documentation
- `scripts/validate-auth.ts` - Verify authentication on all routes

## Contributing

When adding new scripts:
1. Use TypeScript with tsx runner
2. Add clear documentation here
3. Include usage examples
4. Make output colorful and readable
