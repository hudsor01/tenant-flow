# Authentication Health Check System

## Overview

TenantFlow includes a comprehensive authentication health check system that programmatically tests all Supabase auth endpoints and configurations. This system goes beyond simple environment variable checking to actually verify that authentication services are functioning correctly.

## Features

### Real-time Health Monitoring
- Tests actual Supabase auth endpoints
- Validates OAuth provider configurations
- Checks session management capabilities
- Verifies rate limiting is active
- Monitors security configuration

### Multiple Access Methods

#### 1. CLI Command
```bash
# Basic health check
npm run auth:health

# Verbose output with details
npm run auth:health:verbose
```

#### 2. API Endpoint
```bash
# JSON response
curl http://localhost:3000/api/auth/health

# HTML report
curl -H "Accept: text/html" http://localhost:3000/api/auth/health
```

#### 3. Web Dashboard
Visit `/auth-status` in development mode for a real-time visual dashboard.

## Health Check Components

### 1. Environment Check
- Validates all required environment variables
- Checks URL formats and protocols
- Ensures production uses HTTPS

### 2. Connection Test
- Verifies Supabase connectivity
- Tests basic API responsiveness

### 3. Email Authentication
- Tests signup endpoint functionality
- Validates email configuration
- Checks for restrictions or rate limits

### 4. OAuth Providers
- Tests Google OAuth configuration
- Validates redirect URL generation
- Checks provider availability

### 5. Session Management
- Verifies session retrieval
- Tests token refresh capabilities
- Validates session persistence

### 6. API Endpoints
- Password reset functionality
- Magic link generation
- User update capabilities

### 7. Rate Limiting
- Verifies rate limits are active
- Tests protection against abuse

### 8. Security Configuration
- Validates HTTPS in production
- Checks authentication keys
- Reviews security headers

## Status Levels

### Healthy ✅
All systems operational. Authentication is fully functional.

### Degraded ⚠️
Some non-critical issues detected. Core functionality works but improvements recommended.

### Unhealthy ❌
Critical issues detected. Authentication may not function properly.

## Configuration

### Production Access Control
In production, protect the health check endpoint:

```env
# .env.production
AUTH_HEALTH_CHECK_TOKEN=your-secret-token
```

Access with:
```bash
curl -H "Authorization: Bearer your-secret-token" \
  https://api.tenantflow.app/api/auth/health
```

### Enable Public Status Page
```env
# Allow public access to status page (not recommended)
ENABLE_PUBLIC_AUTH_STATUS=true
```

## Recommendations System

The health check provides actionable recommendations:

- **Supabase Dashboard Settings**: Email templates, redirect URLs, security settings
- **OAuth Configuration**: Provider setup, credentials, redirect URIs
- **Security Improvements**: HTTPS, MFA, RLS policies
- **Performance Optimization**: Rate limiting, session management

## Integration with Monitoring

The health check integrates with existing monitoring:

```typescript
// Automatic logging to PostHog
logger.info('Auth health check completed', {
  component: 'AuthHealthCheck',
  overall: status.overall,
  checks: checkResults
})
```

## Programmatic Usage

```typescript
import { authHealthChecker } from '@/lib/auth/auth-health-check'

// Run health check
const status = await authHealthChecker.runHealthCheck()

// Check specific status
if (status.overall === 'unhealthy') {
  // Alert administrators
  // Disable auth features
  // Show maintenance message
}

// Generate HTML report
const report = authHealthChecker.generateHTMLReport(status)
```

## Troubleshooting

### Common Issues

#### "Rate limiting may not be configured"
- Enable rate limiting in Supabase Dashboard
- Configure appropriate limits for your use case

#### "Some OAuth providers not configured"
- Add OAuth credentials in Supabase Dashboard
- Configure redirect URLs in provider console

#### "Email auth configured but has restrictions"
- Check email domain restrictions
- Verify SMTP configuration
- Review rate limits

### Debug Mode

Enable verbose logging:
```bash
DEBUG=auth:* npm run auth:health:verbose
```

## CI/CD Integration

Add to your deployment pipeline:

```yaml
# .github/workflows/deploy.yml
- name: Check Auth Health
  run: |
    npm run auth:health
    if [ $? -ne 0 ]; then
      echo "Auth system unhealthy, aborting deployment"
      exit 1
    fi
```

## Best Practices

1. **Regular Monitoring**: Run health checks after configuration changes
2. **Pre-deployment Validation**: Include in CI/CD pipeline
3. **Production Protection**: Always use authentication tokens in production
4. **Alert Integration**: Connect to PagerDuty/Slack for critical failures
5. **Documentation**: Keep Supabase configuration documented

## API Response Format

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "production",
  "overall": "healthy",
  "checks": {
    "environment": {
      "status": "pass",
      "message": "All environment variables configured correctly"
    },
    "connection": {
      "status": "pass",
      "message": "Supabase connection successful"
    },
    // ... other checks
  },
  "recommendations": [
    "✅ All auth systems functioning optimally!"
  ]
}
```

## Future Enhancements

- **Webhook Testing**: Validate webhook endpoints
- **MFA Status**: Check multi-factor authentication configuration
- **Custom Providers**: Test additional OAuth providers
- **Performance Metrics**: Response time tracking
- **Historical Data**: Track health over time
- **Automated Remediation**: Self-healing capabilities

## Related Documentation

- [Security Audit Checklist](./SECURITY-AUDIT-CHECKLIST.md)
- [Authentication Roadmap](./ROADMAP.md)
- [Supabase Configuration](./CLAUDE.md#supabase-configuration)