# Ultra-Native NestJS Architecture Guide

**Philosophy**: Use official NestJS ecosystem packages directly, never create custom abstractions.

**Protected File**: This architecture document defines core backend patterns for TenantFlow.

---

## DTO Pattern (Native NestJS)

**Class-Based DTOs are NATIVE NestJS**, not custom abstractions:
- Official NestJS documentation pattern
- Required for runtime validation (ValidationPipe needs classes, not interfaces)
- TypeScript interfaces cannot provide runtime validation (erased at compile-time)

### Why Classes are Required (Technical)

**The TypeScript Compilation Problem**:
- **Interfaces**: Erased at compile-time → No runtime type information
- **Classes**: Persist at runtime → Enable reflection metadata, decorators, validation

**What ValidationPipe Needs**:
1. Runtime type information (classes provide via constructor)
2. Decorator metadata (only classes support decorators)
3. Ability to instantiate (interfaces have no constructor)

**Without classes, runtime validation is impossible.**

### Two DTO Types

**1. Input DTOs** (Request Validation):
- Validate incoming request data (`@Body()`, `@Query()`, `@Param()`)
- Use `nestjs-zod` + `createZodDto(schema)`
- Zod schemas defined in `packages/shared/src/validation/`

**2. Response DTOs** (Output Serialization):
- Hide sensitive fields (passwords, secrets, internal IDs)
- Transform data (format dates, compute properties)
- Use `class-transformer` decorators (`@Exclude`, `@Expose`, `@Type`)

---

## Implementation Pattern

### Input Validation (nestjs-zod)

```typescript
// 1. Define schema in packages/shared/src/validation/users.ts
import { z } from 'zod'

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2)
})

// Update DTOs: Use built-in Zod methods (NOT custom factories)
export const updateUserSchema = createUserSchema.partial() // All fields optional

// 2. Create DTO in apps/backend/src/modules/users/dto/create-user.dto.ts
import { createZodDto } from 'nestjs-zod'
import { createUserSchema } from '@repo/shared/validation'

export class CreateUserDto extends createZodDto(createUserSchema) {}

// 3. Use in controller
@Post()
async create(@Body() body: CreateUserDto) {
  // ✅ Fully typed
  // ✅ Validated by ZodValidationPipe
  // ✅ No type assertions needed
  return this.userService.create(body)
}
```

### Response Serialization (class-transformer)

```typescript
// 1. Create response DTO in apps/backend/src/modules/users/dto/user-response.dto.ts
import { Exclude, Expose, Type } from 'class-transformer'

export class UserResponseDto {
  @Expose()
  id: string

  @Expose()
  email: string

  @Exclude() // ✅ Password never sent to client
  password: string

  @Exclude() // ✅ Internal notes stay internal
  internalNotes: string

  @Expose()
  @Type(() => Date)
  createdAt: Date

  @Expose()
  get displayName(): string {
    // Computed property
    return `${this.firstName} ${this.lastName}`
  }
}

// 2. Enable ClassSerializerInterceptor globally in main.ts
import { ClassSerializerInterceptor, Reflector } from '@nestjs/common'

app.useGlobalInterceptors(
  new ClassSerializerInterceptor(app.get(Reflector))
)

// 3. Use in controller
@Get(':id')
@SerializeOptions({ type: UserResponseDto })
async findOne(@Param('id') id: string): Promise<UserResponseDto> {
  // ✅ Response automatically serialized
  // ✅ Sensitive fields excluded
  return this.userService.findOne(id)
}
```

---

## File Organization

```
apps/backend/src/modules/{domain}/
├── dto/
│   ├── create-{entity}.dto.ts      # Input DTO (nestjs-zod)
│   ├── update-{entity}.dto.ts      # Input DTO (nestjs-zod)
│   └── {entity}-response.dto.ts    # Response DTO (class-transformer)
├── {entity}.controller.ts
├── {entity}.service.ts
└── {entity}.module.ts

packages/shared/src/validation/
└── {domain}.ts                      # Zod schemas (single source of truth)
```

---

## Validation Groups

Use Zod built-in methods (NOT custom factories):

```typescript
const baseSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string()
})

// Create DTO - all fields required
export const createUserSchema = baseSchema

// Update DTO - all fields optional (built-in .partial())
export const updateUserSchema = baseSchema.partial()

// Partial update - only email and name (built-in .pick())
export const partialUpdateSchema = baseSchema.pick({ email: true, name: true })

// Public profile - exclude password (built-in .omit())
export const publicUserSchema = baseSchema.omit({ password: true })
```

**IMPORTANT**: These are **built-in Zod methods**, not custom factory functions.

---

## Setup Requirements

### 1. Install Dependencies
```bash
pnpm add nestjs-zod zod class-transformer class-validator
```

### 2. Register ZodValidationPipe (AppModule)
```typescript
import { APP_PIPE } from '@nestjs/core'
import { ZodValidationPipe } from 'nestjs-zod'

@Module({
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe
    }
  ]
})
export class AppModule {}
```

### 3. Enable ClassSerializerInterceptor (main.ts)
```typescript
import { ClassSerializerInterceptor, Reflector } from '@nestjs/common'

app.useGlobalInterceptors(
  new ClassSerializerInterceptor(app.get(Reflector))
)
```

---

## What's Allowed vs Forbidden

### ✅ ALLOWED (Native NestJS Ecosystem)

- **Input Validation**: `nestjs-zod`, `createZodDto()`, `ZodValidationPipe`
- **Response Serialization**: `class-transformer`, `ClassSerializerInterceptor`
- **Built-in Zod Methods**: `.partial()`, `.pick()`, `.omit()`, `.extend()`
- **Built-in Decorators**: `@Exclude()`, `@Expose()`, `@Type()`, `@Transform()`

### ❌ FORBIDDEN (Custom Abstractions)

- **Custom Decorators**: Not native NestJS (you create them)
- **Custom Validation Pipes**: Wrappers around native pipes
- **DTO Factories**: Custom factory functions (use `createZodDto()` only)
- **Custom Base Classes**: Inheritance hierarchies beyond `createZodDto()`
- **Wrapper Functions**: Abstractions around native features

---

## Single Source of Truth

```
Zod Schema (packages/shared/src/validation/)
    ↓
Input DTO Class (via createZodDto)
    ↓
TypeScript Types (via z.infer)
    ↓
Response DTO Class (via class-transformer)
```

---

## Benefits

**Before DTOs**:
- ❌ Type assertions (`as`) defeated TypeScript strict mode
- ❌ No response serialization (passwords exposed in API responses)
- ❌ Manual validation in controllers
- ❌ Confusion about abstractions vs native patterns

**After DTOs (Standard Level)**:
- ✅ TypeScript strict mode preserved (no `as` keyword)
- ✅ Passwords/sensitive data hidden via `@Exclude()`
- ✅ Automatic validation via `ZodValidationPipe`
- ✅ Single source of truth (Zod schema → DTO → types)
- ✅ Clear guidance: DTOs are native NestJS, not abstractions
- ✅ Security by default (response serialization)

---

## OpenAPI/Swagger (Optional - Deferred)

**Status**: Deferred until maintenance phase

**Rationale**:
- Focus on core functionality during active development
- Can be added later in 5 minutes (official `@nestjs/swagger` package)
- Does not affect code quality or security

**When to Add**:
- Project enters maintenance mode
- Need to onboard contractors/co-founders
- Building mobile apps or third-party integrations
- Want auto-generated API documentation

**Setup** (5 minutes):
```typescript
// main.ts
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

const config = new DocumentBuilder()
  .setTitle('TenantFlow API')
  .setVersion('1.0')
  .build()

const document = SwaggerModule.createDocument(app, config)
SwaggerModule.setup('api/docs', app, document)
```

---

**Last Updated**: October 2025
**Architecture Level**: Standard (Input Validation + Response Serialization)
