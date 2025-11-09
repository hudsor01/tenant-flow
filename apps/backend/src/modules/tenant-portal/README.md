# Tenant Portal Module

Modular architecture for tenant-facing operations using NestJS RouterModule pattern.

## Architecture

**Parent Module**: `TenantPortalModule`  
**Route Prefix**: `/tenant`  
**Role Requirement**: `TENANT` (validated via `TenantAuthGuard`)

### Child Modules

1. **Payments** - `/tenant/payments`
   - Payment history
   - Upcoming payments  
   - Payment method management

2. **Autopay** - `/tenant/autopay`
   - Subscription status
   - Autopay configuration
   - Next payment date

3. **Maintenance** - `/tenant/maintenance`
   - Submit requests
   - View history
   - Track status

4. **Leases** - `/tenant/leases`
   - Active lease details
   - Lease documents
   - Payment receipts

5. **Settings** - `/tenant/settings`
   - Profile management
   - Notification preferences
   - Account settings

## Security Model

### Three-Layer Defense

1. **JWT Authentication** (`JwtAuthGuard`)
   - Validates bearer token
   - Extracts auth user ID

2. **Role Authorization** (`TenantAuthGuard`)
   - Queries database for tenant record
   - Validates TENANT role
   - Checks account status
   - Attaches tenant context to request

3. **Database RLS**
   - Enforces `auth.uid() = auth_user_id`
   - Prevents data leakage
   - Zero-trust architecture

### Request Context

`TenantAuthGuard` attaches tenant context to every request:

```typescript
request.tenantContext = {
  tenantId: string        // Database tenant ID
  authUserId: string      // Supabase auth user ID  
  status: string          // Account status
}
```

Use `TenantContextInterceptor` for automatic logging:

```typescript
@UseInterceptors(TenantContextInterceptor)
export class TenantPaymentsController {
  // Automatic request/response logging with tenant context
}
```

## Usage Examples

### Basic Controller

```typescript
import { Controller, Get, UseGuards, UseInterceptors } from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { TenantAuthGuard } from '../guards/tenant-auth.guard'
import { TenantContextInterceptor } from '../interceptors/tenant-context.interceptor'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { User } from '../../shared/decorators/user.decorator'
import type { authUser } from '@repo/shared/types/auth'

@Controller()
@UseGuards(JwtAuthGuard, TenantAuthGuard)
@UseInterceptors(TenantContextInterceptor)
export class TenantPaymentsController {
  @Get()
  async getPayments(
    @JwtToken() token: string,
    @User() user: authUser
  ) {
    // Tenant role validated
    // Context available in request
    // RLS enforced at database
  }
}
```

### Accessing Tenant Context

```typescript
import type { AuthenticatedRequest } from '../interceptors/tenant-context.interceptor'

@Get()
async getSettings(@Req() req: AuthenticatedRequest) {
  const tenantId = req.tenantContext?.tenantId
  // Use tenant context for operations
}
```

## File Structure

```
tenant-portal/
├── tenant-portal.module.ts         # Parent module with RouterModule
├── README.md                        # This file
├── index.ts                         # Export barrel
├── guards/
│   └── tenant-auth.guard.ts        # TENANT role validation
├── interceptors/
│   └── tenant-context.interceptor.ts  # Logging and context
├── payments/
│   ├── payments.controller.ts
│   └── payments.module.ts
├── autopay/
│   ├── autopay.controller.ts
│   └── autopay.module.ts
├── maintenance/
│   ├── maintenance.controller.ts
│   └── maintenance.module.ts
├── leases/
│   ├── leases.controller.ts
│   └── leases.module.ts
└── settings/
    ├── settings.controller.ts
    └── settings.module.ts
```

## Route Organization

All routes follow `/tenant/{module}/{endpoint}` pattern:

| Module | Route | Description |
|--------|-------|-------------|
| Payments | `GET /tenant/payments` | Payment history |
| Autopay | `GET /tenant/autopay` | Subscription status |
| Maintenance | `GET /tenant/maintenance` | Request history |
| Maintenance | `POST /tenant/maintenance` | Submit request |
| Leases | `GET /tenant/leases` | Active lease |
| Leases | `GET /tenant/leases/documents` | Lease documents |
| Settings | `GET /tenant/settings` | Profile settings |

## Benefits

1. **Modularity** - Each domain has its own module
2. **Security** - Role-based guards with RLS  
3. **Maintainability** - Clear separation of concerns
4. **Scalability** - Easy to add new modules
5. **Testing** - Modules can be tested independently
6. **Organization** - Routes grouped by domain

## Migration from Legacy Controller

The original `TenantPortalController` has been split into 5 specialized controllers:

- **Dashboard endpoint** → Removed (aggregation done client-side)
- **Lease endpoint** → `TenantLeasesController`
- **Maintenance endpoints** → `TenantMaintenanceController`
- **Payments endpoint** → `TenantPaymentsController`
- **Documents endpoint** → `TenantLeasesController.getDocuments()`

New modules:
- **Autopay** - Subscription management (new functionality)
- **Settings** - Profile/preferences (new functionality)

## Testing

Guards and interceptors are registered as providers in the parent module:

```typescript
@Module({
  providers: [TenantAuthGuard, TenantContextInterceptor],
  exports: [TenantAuthGuard, TenantContextInterceptor]
})
export class TenantPortalModule {}
```

Mock in tests:

```typescript
const mockTenantAuthGuard = {
  canActivate: jest.fn(() => true)
}

Test.createTestingModule({
  controllers: [TenantPaymentsController],
  providers: [
    { provide: TenantAuthGuard, useValue: mockTenantAuthGuard }
  ]
})
```

## See Also

- [Owner Dashboard Module](../owner-dashboard/README.md) - Similar pattern for owners
- [TenantAuthGuard](./guards/tenant-auth.guard.ts) - Role validation implementation
- [TenantContextInterceptor](./interceptors/tenant-context.interceptor.ts) - Request logging
