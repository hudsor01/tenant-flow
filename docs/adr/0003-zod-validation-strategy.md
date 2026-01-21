# ADR-0003: Zod Validation Strategy

## Status
Accepted

## Context
TenantFlow is a full-stack TypeScript application where validation is needed at multiple layers:

1. **Frontend forms**: User input validation with real-time feedback
2. **API requests**: Request body/query validation before processing
3. **Database operations**: Ensuring data integrity before writes

Maintaining separate validation logic at each layer leads to:
- Duplicated validation rules
- Inconsistent error messages
- Type mismatches between layers
- High maintenance burden

### Options Considered

1. **class-validator decorators**: NestJS default, separate from types
2. **Yup schemas**: Popular but less TypeScript-native
3. **Zod schemas with nestjs-zod**: Single source of truth with type inference
4. **io-ts**: Functional approach, steeper learning curve

## Decision
We chose **Zod schemas as the single source of truth** with the following strategy:

### Schema Location
All validation schemas live in `packages/shared/src/validation/`:
```
packages/shared/src/validation/
├── properties.ts      # Property schemas
├── tenants.ts         # Tenant schemas
├── leases.ts          # Lease schemas
├── maintenance.ts     # Maintenance schemas
└── generated-schemas.ts # Auto-generated from database
```

### Backend Integration (NestJS)
Use `nestjs-zod` to wrap shared schemas as DTOs:

```typescript
// packages/shared/src/validation/properties.ts
export const propertyCreateSchema = z.object({
  name: z.string().min(1).max(100),
  address_line1: z.string().min(1),
  // ...
});

export type PropertyCreate = z.infer<typeof propertyCreateSchema>;

// apps/backend/src/modules/properties/dto/create-property.dto.ts
import { createZodDto } from 'nestjs-zod';
import { propertyCreateSchema } from '@repo/shared/validation/properties';

export class CreatePropertyDto extends createZodDto(propertyCreateSchema) {}
```

### Frontend Integration (TanStack Form)
Use schemas directly with form libraries:

```typescript
import { propertyCreateSchema } from '@repo/shared/validation/properties';

const form = useForm({
  defaultValues: { name: '', address_line1: '' },
  validators: {
    onChange: propertyCreateSchema,
  },
});
```

### Auto-Generated Schemas
Database types generate corresponding schemas:
```bash
pnpm db:types  # Regenerates supabase.ts and generated-schemas.ts
```

## Consequences

### Positive
- **Single source of truth**: One schema definition used everywhere
- **Type inference**: `z.infer<typeof schema>` gives TypeScript types
- **Consistent errors**: Same error messages frontend and backend
- **Auto-sync**: Generated schemas keep pace with database changes

### Negative
- **Build dependency**: Shared package must build before consumers
- **Learning curve**: Developers must know Zod syntax
- **Generated schema limitations**: Complex constraints may need manual schemas

### Mitigations
- **Turbo dependency**: `"dependsOn": ["^build"]` ensures shared builds first
- **Zod documentation**: Link to Zod docs in onboarding
- **Hybrid approach**: Use generated schemas as base, extend manually

## Implementation Checklist

- [x] Zod schemas in `packages/shared/src/validation/`
- [x] `nestjs-zod` integration in backend
- [x] Schema auto-generation from database
- [x] TanStack Form integration in frontend
- [x] Global ZodValidationPipe in NestJS

## References
- Zod Documentation: https://zod.dev/
- nestjs-zod: https://github.com/risenforces/nestjs-zod
- `packages/shared/src/validation/` - Schema implementations
- `apps/backend/src/main.ts` - Global validation pipe setup
