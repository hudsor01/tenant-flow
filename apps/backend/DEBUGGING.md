# API Debugging Guide

This document explains how to use the API debugging tools for the TenantFlow backend.

## Available Debugging Scripts

### 1. Basic API Debug Script

Run the basic API debug script to test endpoints:

```bash
pnpm debug:api
```

This script will:
- Initialize the NestJS application
- Test the `/health` endpoint
- Test user-related endpoints with mock authentication

### 2. Manual Debugging

You can also use the debugging utility programmatically:

```typescript
import { APIDebugger } from './scripts/api-debugger'

const debugger = new APIDebugger()
await debugger.initialize()

// Debug any endpoint
await debugger.debugEndpoint('GET', '/users/me', {
  user_id: 'test-user-123',
  email: 'test@example.com'
})

await debugger.close()
```

## Debugging Capabilities

The API debugger provides the following features:

### Endpoint Testing
- Test any HTTP method (GET, POST, PUT, DELETE, PATCH)
- Support for query parameters
- Authentication header injection
- Request body sending for POST/PUT/PATCH

### User Endpoints
The debugger includes pre-configured tests for:
- `/health` - Health check endpoint
- `/users/me` - Get current user
- `/users/profile` - Get user profile
- `/users/sessions` - Get user sessions
- `/users/tours/:tourKey` - Get tour progress

### Detailed Logging
- Request method and endpoint
- Request headers and body
- Response status and body
- Query parameters
- Authentication details

## Usage Examples

### Quick Health Check
```bash
pnpm debug:api
```

### Custom Endpoint Debugging
```typescript
await debugger.debugSpecificEndpoint('GET', '/users/profile', {
  auth: {
    user_id: 'user-123',
    email: 'user@example.com'
  }
})
```

### Debug with Query Parameters
```typescript
await debugger.debugEndpoint('GET', '/users/tours', undefined, undefined, {
  limit: '10',
  offset: '0'
})
```

## Integration with Existing Tests

The debugging tools leverage the existing test infrastructure:
- Uses the same test environment setup
- Inherits all existing configurations
- Works with the same database connections
- Follows the same authentication patterns

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure Supabase is running: `supabase start`
   - Check `.env.test.local` configuration

2. **Authentication Issues**
   - The debugger uses mock JWT tokens
   - Real authentication requires valid tokens

3. **Timeout Errors**
   - Increase timeout in test setup if needed
   - Check network connectivity to external services

### Debug Mode

Enable debug output by setting the DEBUG environment variable:

```bash
DEBUG=1 pnpm debug:api
```

## Extending the Debugger

To add new endpoints to the automatic testing:

1. Edit `apps/backend/scripts/api-debugger.ts`
2. Add new test methods in the `debugUserEndpoints` function
3. Or create custom debugging functions as needed

## Best Practices

1. **Use Mock Data**: Always use consistent mock data for reproducible tests
2. **Check Responses**: Verify both status codes and response bodies
3. **Test Authentication**: Ensure auth endpoints work correctly
4. **Monitor Logs**: Pay attention to any error messages in the console output
5. **Clean Up**: Always close the debugger when done

## Related Documentation

- [NestJS Testing Guide](https://docs.nestjs.com/fundamentals/testing)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [TenantFlow Architecture](../docs/ARCHITECTURE.md)