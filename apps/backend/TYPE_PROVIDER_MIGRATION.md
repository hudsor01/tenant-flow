# Fastify Type Provider Migration Guide

This document outlines the migration from class-validator DTOs to schema-driven type inference using Fastify Type Providers.

## Overview

The Type Provider system eliminates redundant type definitions by using JSON Schemas as the single source of truth for both validation and TypeScript types.

### Benefits

- **Single Source of Truth**: Types are inferred automatically from schemas
- **Better Performance**: Native Fastify validation is faster than class-validator
- **Compile-time Safety**: Full TypeScript type checking without manual type definitions
- **Consistency**: Validation rules and types stay in sync automatically
- **Reduced Boilerplate**: No more DTO classes with duplicate validation decorators

## Architecture

```
JSON Schema → TypeScript Types (automatic)
     ↓
Fastify Validation (runtime)
     ↓
Type-safe Controllers
```

## Migration Steps

### 1. Schema Definition

Replace class-validator DTOs with JSON Schema definitions:

**Before (Class-validator DTO):**
```typescript
export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean
}
```

**After (JSON Schema):**
```typescript
export interface LoginRequest {
  email: string
  password: string
  rememberMe?: boolean
}

export const loginSchema = createTypedSchema<LoginRequest>({
  type: 'object',
  required: ['email', 'password'],
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
    rememberMe: { type: 'boolean' }
  }
})
```

### 2. Controller Migration

Update controllers to use schema-inferred types:

**Before:**
```typescript
@Post('login')
async login(@Body(ValidationPipe) body: LoginDto) {
  // body type is manually defined LoginDto
}
```

**After:**
```typescript
@Post('login')
async login(
  @Body(new SchemaValidationPipe(loginSchema, schemaValidation))
  body: LoginRequest // Type automatically inferred from schema
) {
  // body is fully typed and validated
}
```

### 3. Pure Fastify Routes (Alternative)

For maximum performance, use pure Fastify routes:

```typescript
registerTypedRoute(
  fastify,
  'POST',
  '/auth/login',
  { body: loginSchema },
  async (request, reply) => {
    // request.body is automatically typed as LoginRequest
    const { email, password } = request.body
    const result = await authService.login(email, password)
    return reply.send(result)
  }
)
```

## Implementation Status

### ✅ Completed
- [x] Fastify Type Provider implementation
- [x] Schema validation service with Ajv
- [x] Auth schemas (login, register, refresh, etc.)
- [x] Notification schemas
- [x] Stripe/billing schemas
- [x] Environment validation with schemas
- [x] Main application integration
- [x] Development helpers and migration utilities

### 🚧 In Progress
- [ ] Controller migration examples
- [ ] Property schemas (extend existing Zod schemas)
- [ ] Tenant management schemas
- [ ] Maintenance request schemas

### ❌ Pending
- [ ] Remove redundant class-validator DTOs
- [ ] Update all controllers to use schema validation
- [ ] Remove manual type definitions where schemas exist
- [ ] Update tests to use schema-validated types
- [ ] Performance benchmarking vs class-validator

## Files Created

### Core Type Provider System
- `src/shared/types/fastify-type-provider.ts` - Core type provider implementation
- `src/shared/validation/schema-validation.service.ts` - Validation service with Ajv
- `src/setup-type-providers.ts` - Application integration and setup

### Schema Definitions
- `src/schemas/auth.schemas.ts` - Authentication schemas
- `src/schemas/notification.schemas.ts` - Notification schemas  
- `src/schemas/stripe.schemas.ts` - Billing/Stripe schemas

### Migration Examples
- `src/auth/auth.controller.typed.ts` - Example of migrated auth controller

## Redundant Types to Remove

After full migration, these can be removed:

### Class-validator DTOs
- `src/auth/dto/auth.dto.ts` (replace with auth.schemas.ts)
- `src/notifications/dto/notification.dto.ts` (replace with notification.schemas.ts)
- `src/stripe/dto/checkout.dto.ts` (replace with stripe.schemas.ts)

### Manual Type Definitions
Many types in `packages/shared/src/types/` can be removed once schemas provide the types:
- `api.ts` - Request/response types (use schema-inferred types)
- Manual DTO interfaces (use schema interfaces)
- Validation constants (embedded in schemas)

### Validation Logic
- Remove ValidationPipe usage where SchemaValidationPipe is used
- Remove class-validator decorators
- Remove manual type validation in services

## Configuration

### Environment Variables
The system validates environment variables using schemas:

```typescript
// Automatic validation on startup
const env = validateEnvironment() // Typed as AppEnvironment
```

### Validation Configuration
Different configs for different environments:

```typescript
// Development: Show all errors, verbose output
// Production: First error only, minimal output
const config = getValidationConfig()
```

## Development Tools

### Type Inference Testing
```typescript
DevHelpers.testTypeInference(loginSchema, sampleLoginData)
```

### Migration Comparison
```typescript
MigrationUtils.compareTypes(dtoInstance, schemaData, 'LoginController')
```

### Schema Registry Status
```typescript
MigrationUtils.logSchemaStatus() // Shows all registered schemas
```

## Performance Considerations

### Benefits
- **Faster Validation**: Ajv is significantly faster than class-validator
- **Smaller Bundle**: No class-validator and reflect-metadata overhead
- **Better Tree Shaking**: Dead code elimination for unused schemas
- **Compile-time Optimization**: TypeScript can optimize schema-inferred types

### Benchmarks
TODO: Add performance benchmarks comparing class-validator vs schema validation

## Error Handling

Schema validation provides detailed error messages:

```typescript
{
  statusCode: 400,
  error: 'Bad Request',
  message: 'Validation failed',
  details: [
    {
      field: 'email',
      value: 'invalid-email',
      message: 'email must be a valid email address',
      constraint: 'format'
    }
  ]
}
```

## Testing Strategy

### Unit Tests
Test schemas directly:
```typescript
const result = schemaValidation.validate(loginSchema, testData)
expect(result.isValid).toBe(true)
expect(result.data).toEqual(expectedData)
```

### Integration Tests
Test controller endpoints with schema validation:
```typescript
const response = await request(app)
  .post('/auth/login')
  .send(validLoginData)
  .expect(200)
```

## Migration Timeline

### Phase 1: Setup (✅ Complete)
- Implement type provider system
- Create core schemas
- Integrate with main application

### Phase 2: Controller Migration (🚧 Current)
- Migrate auth controller
- Migrate notification controller
- Migrate stripe controller

### Phase 3: Cleanup (❌ Pending)
- Remove class-validator DTOs
- Remove redundant types
- Update all tests

### Phase 4: Optimization (❌ Future)
- Performance tuning
- Bundle size optimization
- Documentation updates

## Best Practices

### Schema Design
1. Use typed interfaces for better IDE support
2. Include detailed descriptions in schemas
3. Use consistent naming conventions
4. Leverage schema references for reusable components

### Error Messages
1. Provide user-friendly error messages
2. Include field-level validation context
3. Use consistent error format across all endpoints

### Type Safety
1. Always use schema-inferred types in controllers
2. Avoid any or unknown types
3. Use compile-time type checking in tests

## Troubleshooting

### Common Issues

**Schema Compilation Errors**
- Check schema syntax against JSON Schema spec
- Ensure all required fields are defined
- Validate schema references exist

**Type Inference Problems**
- Verify schema is properly typed with createTypedSchema()
- Check TypeScript configuration allows complex type inference
- Ensure schema registry is properly initialized

**Validation Failures**
- Check Ajv configuration matches schema requirements
- Verify custom formats and keywords are registered
- Test schemas in isolation before integration

## Next Steps

1. Complete controller migrations
2. Extend to remaining domains (properties, tenants, maintenance)
3. Remove redundant type definitions
4. Performance optimization and benchmarking
5. Documentation and team training

## Resources

- [JSON Schema Specification](https://json-schema.org/)
- [Ajv JSON Schema Validator](https://ajv.js.org/)
- [Fastify Schema Validation](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)
- [TypeScript Advanced Types](https://www.typescriptlang.org/docs/handbook/advanced-types.html)