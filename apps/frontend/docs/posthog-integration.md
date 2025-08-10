# PostHog Analytics Integration Guide

## Overview
TenantFlow is now fully integrated with PostHog for comprehensive analytics, user tracking, and feature management. The implementation follows PostHog's official Next.js 15 App Router best practices.

## Key Features Implemented

### 1. Core Infrastructure
- **Provider Setup**: `PHProvider` wraps the application with PostHog context
- **Reverse Proxy**: Configured `/ingest` routes to bypass ad blockers
- **CSP Updates**: Added PostHog domains to Content Security Policy
- **Environment Variables**: Configured for PostHog API key and host

### 2. Automatic Tracking

#### Page Views
- Automatic page view tracking with performance metrics
- Captures URL, pathname, search params, referrer, and viewport dimensions
- Implemented in `PostHogPageView` component

#### Error Tracking
- Error boundary integration for automatic error capture
- Captures error message, stack trace, and component information
- Implemented in `PostHogErrorBoundary` component

#### User Identification
- Automatic user identification on login
- User properties synced with PostHog
- Session tracking and reset on logout
- Implemented in `PostHogUserProvider` component

### 3. Custom Event Tracking

#### Event Types
The system tracks 40+ custom events including:
- Authentication events (sign up, sign in, sign out)
- Property management events (CRUD operations)
- Tenant management events
- Lease management events
- Maintenance request events
- Payment and subscription events
- Feature usage events
- Error events

#### Tracking Hooks
- `usePostHog()`: Main hook for all tracking operations
- `usePropertyTracking()`: Property-specific tracking
- Custom `TrackButton` component for automatic button click tracking

### 4. Advanced Features

#### Feature Flags
```typescript
const { isFeatureEnabled } = usePostHog()
const showNewFeature = isFeatureEnabled('new-dashboard-design', false)
```

#### Conversion Tracking
```typescript
const { trackConversion } = usePostHog()
trackConversion('property_created', propertyValue, { 
  property_type: 'COMMERCIAL' 
})
```

#### Timing Metrics
```typescript
const { trackTiming } = usePostHog()
trackTiming('api', 'property_save_time', responseTime, 'property_form')
```

## File Structure

```
src/
├── providers/
│   └── posthog-provider.tsx          # Main PostHog provider
├── components/analytics/
│   ├── posthog-page-view.tsx         # Page view tracking
│   ├── posthog-user-provider.tsx     # User identification
│   ├── posthog-error-boundary.tsx    # Error tracking
│   ├── track-button.tsx              # Button tracking component
│   └── dashboard-metrics-tracker.tsx # Dashboard metrics example
├── hooks/
│   ├── use-posthog.ts               # Main PostHog hook
│   └── use-property-tracking.ts     # Property tracking hook
└── app/(dashboard)/layout.tsx       # Provider integration
```

## Configuration

### Environment Variables
```env
# PostHog Analytics Configuration
NEXT_PUBLIC_POSTHOG_KEY=phc_your_project_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

### Next.js Config (Reverse Proxy)
```typescript
async rewrites() {
  return [
    {
      source: '/ingest/:path*',
      destination: 'https://us.i.posthog.com/:path*',
    },
  ];
}
```

## Usage Examples

### Track Custom Event
```typescript
const { trackEvent } = usePostHog()

trackEvent('property_created', {
  property_id: property.id,
  property_type: property.propertyType,
  units: property.units,
})
```

### Track Form Interactions
```typescript
<PropertyFormWithTracking
  onSubmit={handleSubmit}
  property={existingProperty}
/>
```

### Track Button Clicks
```typescript
<TrackButton
  trackEvent="subscription_upgraded"
  trackProperties={{ plan: 'premium' }}
>
  Upgrade to Premium
</TrackButton>
```

### Check Feature Flag
```typescript
const { isFeatureEnabled } = usePostHog()

if (isFeatureEnabled('new-payment-flow')) {
  return <NewPaymentFlow />
}
```

## Privacy & Compliance

### User Privacy
- Session recording masks all input fields by default
- Sensitive fields (password, email, tel) are always masked
- Respects browser Do Not Track settings
- Only tracks identified users to reduce costs

### GDPR Compliance
- User consent checked via environment variable
- Opt-out capability provided
- User data reset on logout
- No tracking in development by default

## Monitoring & Debugging

### Development
- PostHog is disabled in development unless explicitly enabled
- Console logging available for debugging
- Use PostHog Chrome extension for testing

### Production
- Real User Monitoring (RUM) enabled
- Performance metrics tracked
- Error tracking with stack traces
- User journey tracking

## Best Practices

1. **Use Reverse Proxy**: Always use `/ingest` endpoint to avoid ad blockers
2. **Track Meaningful Events**: Focus on business-critical user actions
3. **Add Context**: Include relevant properties with events
4. **Use Feature Flags**: Gradually roll out new features
5. **Monitor Performance**: Track timing metrics for critical operations
6. **Respect Privacy**: Always mask sensitive data
7. **Test Thoroughly**: Verify tracking in PostHog dashboard

## Next Steps

To fully utilize PostHog:

1. **Configure PostHog Dashboard**:
   - Set up funnels for conversion tracking
   - Create cohorts for user segmentation
   - Configure alerts for critical metrics

2. **Add More Tracking**:
   - Payment flow tracking
   - Maintenance request lifecycle
   - User engagement metrics

3. **Implement A/B Testing**:
   - Use feature flags for experiments
   - Track variant performance
   - Make data-driven decisions

4. **Setup Integrations**:
   - Connect to Slack for alerts
   - Export to data warehouse
   - Integrate with customer support tools

## Troubleshooting

### Events Not Appearing
1. Check environment variables are set
2. Verify reverse proxy is working
3. Check browser console for errors
4. Ensure PostHog is initialized

### User Not Identified
1. Verify user is logged in
2. Check `PostHogUserProvider` is mounted
3. Verify user ID is available

### Feature Flags Not Working
1. Check flag is enabled in PostHog dashboard
2. Verify user meets targeting criteria
3. Check flag key matches exactly

## Support

For issues or questions:
- Check PostHog documentation: https://posthog.com/docs
- Review implementation in `/src/hooks/use-posthog.ts`
- Check PostHog status: https://status.posthog.com