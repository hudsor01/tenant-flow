# Common Backend Utilities

This directory contains shared utilities, services, and infrastructure for the TenantFlow backend.

## Structure

```
common/
├── decorators/          # Method and class decorators
│   └── catch-errors.decorator.ts
├── errors/              # Error handling services
│   ├── error.module.ts
│   └── error-handler.service.ts
├── exceptions/          # Custom exception classes
│   └── base.exception.ts
├── filters/             # Exception filters
│   └── global-exception.filter.ts
├── guards/              # Authentication and error boundary guards
│   └── error-boundary.guard.ts
├── interceptors/        # Request/response interceptors
│   ├── error-logging.interceptor.ts
│   └── error-transformation.interceptor.ts
├── middleware/          # Custom middleware
│   ├── api-version.middleware.ts
│   └── content-type.middleware.ts
└── security/            # Security utilities
    ├── audit.service.ts
    └── query-validation.middleware.ts
```

## Error Handling System

### Components

1. **GlobalExceptionFilter** - Catches all unhandled exceptions and formats responses
2. **ErrorTransformationInterceptor** - Transforms various error types to standard format
3. **ErrorLoggingInterceptor** - Logs all errors with request context
4. **ErrorBoundaryGuard** - Prevents application crashes from critical errors
5. **Custom Exceptions** - Type-safe, domain-specific error classes
6. **Error Decorators** - Method-level error handling utilities

### Usage

```typescript
import { 
  NotFoundException, 
  ValidationException,
  CatchErrors 
} from '../common/exceptions/base.exception'

@Injectable()
export class MyService {
  @CatchErrors('Operation failed')
  async findById(id: string) {
    if (!id) {
      throw new ValidationException('ID is required', 'id')
    }
    
    const result = await this.repository.findById(id)
    if (!result) {
      throw new NotFoundException('Resource', id)
    }
    
    return result
  }
}
```

### Features

- ✅ **Standardized Error Responses** - Consistent error format across all endpoints
- ✅ **Automatic Prisma Error Handling** - Converts database errors to user-friendly messages
- ✅ **Comprehensive Logging** - Detailed error logs with request context
- ✅ **Type Safety** - Custom exception classes with proper typing
- ✅ **Monitoring Ready** - Integration points for external monitoring services
- ✅ **Performance Optimized** - Minimal overhead on successful requests

## Security

### Audit Service
Tracks security-relevant events and maintains audit logs.

### Query Validation
Validates and sanitizes database queries to prevent injection attacks.

## Middleware

### API Version Middleware
Handles API versioning based on headers or URL parameters.

### Content Type Middleware  
Validates request content types and handles CORS.

## Testing

Run error handling tests:
```bash
npm run test:error-handling
```

## Documentation

- [Error Handling Guide](../../../docs/error-handling-guide.md) - Complete usage guide
- [Security Guide](../../../docs/security-guide.md) - Security best practices

## Contributing

When adding new common utilities:

1. Follow the existing directory structure
2. Add comprehensive tests
3. Update this README
4. Include JSDoc comments
5. Export from appropriate index files