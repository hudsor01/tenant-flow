# ADR-0006: API Response Standards

## Status

Accepted

## Context

TenantFlow's NestJS backend has grown organically, resulting in varied API response formats across controllers. While request validation is comprehensive (33 DTOs using Zod + global ZodValidationPipe), response formats are inconsistent:

| Pattern | Example Controllers | Issues |
|---------|---------------------|--------|
| `{ data, total, limit, offset, hasMore }` | properties, units, maintenance | **Standard for paginated lists** |
| `{ data, total }` | tenants | Missing pagination fields |
| `{ ...data, hasMore }` | leases | Spreads service result |
| `{ success: true }` | analytics | Simple acknowledgment |
| `{ success: true, data }` | reports | Wrapped with success flag |
| `{ [key]: [...] }` | rent-payments | Custom key names |
| Raw object | All detail endpoints | Consistent |
| `{ message }` | Delete endpoints | Consistent |

Without standardization:
1. Frontend must handle multiple response shapes for similar operations
2. Documentation becomes inconsistent (Swagger responses vary)
3. New developers may introduce additional patterns

## Decision

### Standard Response Formats

#### 1. Paginated List Response

For endpoints returning paginated lists, use the `PaginatedResponse<T>` format:

```typescript
// Standard paginated response
{
  data: T[],           // Array of items
  total: number,       // Total items matching query (before pagination)
  limit: number,       // Items per page (from query, default 10)
  offset: number,      // Current offset (from query, default 0)
  hasMore: boolean     // true if more items exist
}
```

**Controller pattern:**
```typescript
@Get()
async findAll(@Query() query: FindAllDto) {
  const data = await this.service.findAll(token, query)

  return {
    data,
    total: data.length,
    limit: query.limit ?? 10,
    offset: query.offset ?? 0,
    hasMore: data.length >= (query.limit ?? 10)
  }
}
```

#### 2. Single Item Response

For detail endpoints (`GET /:id`), return the raw object:

```typescript
// Single item - raw object
{
  id: "uuid",
  name: "...",
  // All entity fields
}
```

#### 3. Create/Update Response

For mutation endpoints, return the created/updated entity:

```typescript
// Created/updated entity - raw object
{
  id: "uuid",
  // All entity fields
  created_at: "ISO timestamp",
  updated_at: "ISO timestamp"
}
```

#### 4. Delete Response

For delete endpoints, return a confirmation message:

```typescript
{
  message: "{Entity} deleted successfully"
}
```

#### 5. Action Response (with side effects)

For POST actions that aren't CRUD (setup, cancel, renew):

```typescript
{
  success: true,
  // Relevant result data
}
```

### Error Response Format

Error responses use NestJS built-in exceptions, which produce:

```typescript
{
  statusCode: number,     // HTTP status code
  message: string,        // Error message
  error: string,          // Error type (e.g., "Not Found")
  details?: unknown       // Optional additional context
}
```

**Exception mapping:**
| Scenario | Exception | Status |
|----------|-----------|--------|
| Not found | `NotFoundException` | 404 |
| Validation failed | `BadRequestException` | 400 |
| Not authenticated | `UnauthorizedException` | 401 |
| Not authorized | `ForbiddenException` | 403 |
| Conflict (duplicate) | `ConflictException` | 409 |
| Server error | `InternalServerErrorException` | 500 |

### Swagger Documentation

All endpoints must include:

```typescript
@ApiOperation({ summary: '...', description: '...' })
@ApiResponse({ status: 200, description: 'Success response description' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 404, description: 'Not found' })  // if applicable
```

### Existing Infrastructure

**Request Validation (no changes needed):**
- Global `ZodValidationPipe` handles all DTOs
- 33 DTOs use `createZodDto()` pattern
- Schemas defined in `packages/shared/src/validation/`

**Error Handling (no changes needed):**
- `DatabaseExceptionFilter` maps PostgrestError to HTTP status
- Error codes: `PGRST116`→404, `23505`→409, `42501`→403
- Error responses include `{ statusCode, message, error, details? }`

## Implementation Guidelines

### When Creating New Endpoints

1. **List endpoints:** Use `PaginatedResponse` format
2. **Detail endpoints:** Return raw entity
3. **Create/Update:** Return created/updated entity
4. **Delete:** Return `{ message }`
5. **Actions:** Return `{ success: true, ...result }`

### Code Example

```typescript
// Example controller following standards
@Controller('widgets')
export class WidgetsController {
  // LIST: Paginated response
  @Get()
  async findAll(@Query() query: FindAllWidgetsDto) {
    const data = await this.service.findAll(query)
    return {
      data,
      total: data.length,
      limit: query.limit ?? 10,
      offset: query.offset ?? 0,
      hasMore: data.length >= (query.limit ?? 10)
    }
  }

  // DETAIL: Raw entity
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const widget = await this.service.findOne(id)
    if (!widget) throw new NotFoundException('Widget not found')
    return widget
  }

  // CREATE: Return created entity
  @Post()
  async create(@Body() dto: CreateWidgetDto) {
    return this.service.create(dto)
  }

  // UPDATE: Return updated entity
  @Put(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWidgetDto) {
    const widget = await this.service.update(id, dto)
    if (!widget) throw new NotFoundException('Widget not found')
    return widget
  }

  // DELETE: Return message
  @Delete(':id')
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id)
    return { message: 'Widget deleted successfully' }
  }

  // ACTION: Return success with result
  @Post(':id/activate')
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.service.activate(id)
    return { success: true, ...result }
  }
}
```

## Consequences

### Positive

- **Consistency:** Frontend can rely on predictable response shapes
- **Discoverability:** New developers can follow established patterns
- **Documentation:** Swagger responses become standardized
- **Maintenance:** Easier to build shared frontend utilities

### Negative

- **Migration effort:** Existing inconsistent endpoints should be updated (logged in INCONSISTENCIES.md)
- **Breaking changes:** Any fixes to existing responses may require frontend updates

### Trade-offs

- **No Response DTOs:** We chose not to add formal response DTOs because:
  - Request validation is the critical path (Zod handles this)
  - Response shapes are documented via Swagger decorators
  - Adding response DTOs would increase boilerplate without significant benefit

- **Success flag usage:** `{ success: true }` is used sparingly for actions, not wrapped around all responses (avoids verbose patterns like `{ success: true, data: { ... } }`)

## Related Decisions

- ADR-0004: Supabase Client Patterns
- ADR-0005: RPC Usage Patterns

## References

- [NestJS Exception Filters](https://docs.nestjs.com/exception-filters)
- [Swagger/OpenAPI Decorators](https://docs.nestjs.com/openapi/decorators)
- [JSON:API Specification](https://jsonapi.org/) (inspiration, not strict adherence)

---
*Date: 2026-01-18*
*Author: Claude (automated via Phase 20)*
