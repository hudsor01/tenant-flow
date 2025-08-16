# Email System Architecture

## Current Implementation Status: ✅ CONSOLIDATED

The email system has been successfully consolidated into a single, production-ready service with no duplicated code or unnecessary layers.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Controllers   │ ──▶│   EmailService   │ ──▶│ ExternalApiService│
│                 │    │                  │    │                 │
│ • Properties    │    │ • Template       │    │ • Resend API    │
│ • Tenants       │    │   Registry       │    │ • Circuit       │
│ • Maintenance   │    │ • React Email    │    │   Breaker       │
│ • Auth          │    │   Rendering      │    │ • Retry Logic   │
└─────────────────┘    │ • Circuit Breaker│    └─────────────────┘
                       │ • Bulk Processing│
                       └──────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │  React Email     │
                       │  Templates       │
                       │                  │
                       │ • Welcome        │
                       │ • Tenant Invite  │
                       │ • Payment        │
                       │ • Lease Alert    │
                       │ • Property Tips  │
                       │ • Features       │
                       │ • Re-engagement  │
                       └──────────────────┘
```

## Unified Service Pattern

**Single Source of Truth**: `/apps/backend/src/email/email.service.ts`

- ✅ Direct React Email template rendering (no wrapper layer)
- ✅ Circuit breaker pattern for resilience
- ✅ Integration with existing ExternalApiService
- ✅ Comprehensive error handling and logging
- ✅ Bulk email processing with rate limiting
- ✅ Template registry pattern for type safety

## Eliminated Components

- ❌ `LeaseEmailService` (stub with no implementation)
- ❌ `EmailTemplateService` (unnecessary abstraction layer)
- ❌ Direct Resend API calls in EmailService (uses ExternalApiService)

## Production Features Implemented

- ✅ Circuit breaker pattern (5 failures opens circuit, 1-minute reset)
- ✅ Batch processing (10 emails per batch, 1-second delay)
- ✅ Email validation and input sanitization
- ✅ Template-based email generation with React Email
- ✅ Comprehensive error handling and logging
- ✅ Health status monitoring
- ✅ Rate limiting integration via ExternalApiService

## Business Email Templates

All templates use consistent branding and design tokens:

1. **Welcome Series** - New user onboarding
2. **Tenant Invitation** - Property access invitations
3. **Payment Reminders** - Rent collection automation
4. **Lease Expiration** - Renewal notifications
5. **Property Tips** - Educational content
6. **Feature Announcements** - Product updates
7. **Re-engagement** - Win-back campaigns

## Integration Points

- **ExternalApiService**: Resilient Resend API calls with retry logic
- **NestJS DI**: Proper dependency injection with ConfigService
- **React Email**: Server-side template rendering to HTML
- **Winston Logger**: Structured logging for monitoring
- **Jest Testing**: Unit and integration test coverage
