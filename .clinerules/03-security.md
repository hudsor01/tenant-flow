# TenantFlow Security Rules

## Multi-Tenant Data Isolation (Critical)
- **RLS Policies**: Every table MUST have Row Level Security enabled
- **Org ID Filtering**: All queries automatically filtered by `org_id = auth.jwt() ->> 'org_id'`
- **Repository Pattern**: Use repositories that enforce RLS, never direct client access
- **Test Isolation**: Verify RLS policies prevent cross-organization data access

## Authentication & Authorization
- **JWT Only**: Use Supabase Auth JWT tokens exclusively
- **Guard Protection**: All API endpoints protected with JwtAuthGuard
- **Session Management**: Proper token refresh and expiration handling
- **Role-Based Access**: Implement appropriate user role restrictions

## Input Security
- **Validation**: Zod schemas for all user inputs and API requests
- **Sanitization**: Sanitize all outputs to prevent XSS attacks
- **SQL Injection**: Use parameterized queries only (Supabase client handles this)
- **File Uploads**: Validate file types, sizes, and scan for malicious content

## Data Protection
- **Secrets Management**: Use environment variables, never hardcode secrets
- **API Keys**: Rotate keys regularly, use least-privilege access
- **Database Credentials**: Supabase managed, no direct database connections
- **Encryption**: Sensitive data encrypted at rest and in transit

## Error Handling Security
- **No Data Leaks**: Error messages never expose sensitive information
- **Generic Errors**: User-facing errors are generic, detailed logs internal only
- **Rate Limiting**: Implement rate limiting on sensitive endpoints
- **Audit Logging**: Log all authentication and authorization events

## Development Security
- **Environment Separation**: Clear separation between dev, staging, production
- **Test Data**: Use synthetic test data, never production data in development
- **Code Reviews**: All security-related changes require thorough review
- **Dependency Scanning**: Regular security audits of npm dependencies