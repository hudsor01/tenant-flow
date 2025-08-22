# PostHog Analytics Migration Guide

## 🎯 Goal: Simplify from 80+ events to 15 essential events

This guide helps migrate from the complex multi-hook tracking system to the simplified `use-analytics` approach.

## Before vs After Comparison

### ❌ OLD Complex Approach
```typescript
// Multiple imports required
import { usePostHog } from '@/hooks/use-posthog'
import { usePropertyTracking } from '@/hooks/use-property-tracking'
import { useBusinessEvents, useInteractionTracking } from '@/lib/analytics/business-events'
import { TrackButton } from '@/components/analytics/track-button'

// Inside component
const { trackEvent, trackTiming } = usePostHog()
const { trackPropertyCreate } = usePropertyTracking()
const { trackPropertyCreated, trackUserError } = useBusinessEvents()
const { trackFormSubmission } = useInteractionTracking()
const [formStartTime] = useState(Date.now())

// Complex tracking logic scattered throughout
const handleSubmit = async (data) => {
  const submitStartTime = Date.now()
  
  // Track form timing
  trackTiming('form', 'property_form_fill_time', Date.now() - formStartTime)
  
  try {
    // Track create event
    trackPropertyCreate(data)
    
    // Submit form
    await onSubmit(data)
    
    // Track submission timing
    trackTiming('api', 'property_save_time', Date.now() - submitStartTime)
    
    // Track form success
    trackFormSubmission('property_form', true)
    
    // Track business event
    trackPropertyCreated({
      property_id: result.id,
      property_type: data.propertyType,
      has_photos: Boolean(data.images?.length),
      // ... many more properties
    })
  } catch (error) {
    trackUserError(error, 'property_form')
    trackFormSubmission('property_form', false)
  }
}
```

### ✅ NEW Simplified Approach
```typescript
// Single import
import { useAnalytics } from '@/hooks/common/use-analytics'

// Inside component
const { track } = useAnalytics()

// Clean, focused tracking
const handleSubmit = async (data) => {
  try {
    await onSubmit(data)
    
    // Single strategic tracking call
    track('property_created', {
      property_type: data.propertyType,
      has_photos: Boolean(data.images?.length)
    })
  } catch (error) {
    track('error_occurred', {
      error_message: error.message,
      feature_name: 'property_form'
    })
  }
}
```

## Migration Steps

### Step 1: Replace Hook Imports

**Remove these imports:**
```typescript
import { usePostHog } from '@/hooks/use-posthog'
import { usePropertyTracking } from '@/hooks/use-property-tracking'
import { useBusinessEvents, useInteractionTracking } from '@/lib/analytics/business-events'
import { TrackButton } from '@/components/analytics/track-button'
```

**Add single import:**
```typescript
import { useAnalytics } from '@/hooks/common/use-analytics'
```

### Step 2: Replace Hook Usage

**Remove complex hook initialization:**
```typescript
const { trackEvent, trackTiming } = usePostHog()
const { trackPropertyCreate } = usePropertyTracking()
const { trackPropertyCreated, trackUserError } = useBusinessEvents()
const { trackFormSubmission } = useInteractionTracking()
```

**Add simplified hook:**
```typescript
const { track, trackError } = useAnalytics()
```

### Step 3: Focus on Essential Events

Only track events from the essential list:

```typescript
type EssentialAnalyticsEvent =
  // User Lifecycle
  | 'user_signed_up'
  | 'user_activated'
  | 'subscription_created'
  | 'subscription_cancelled'

  // Core Product Usage
  | 'property_created'
  | 'tenant_added'
  | 'lease_generated'
  | 'maintenance_requested'

  // Business Critical
  | 'payment_completed'
  | 'payment_failed'
  | 'trial_started'
  | 'trial_converted'
  
  // System Health
  | 'error_occurred'
```

### Step 4: Remove Timing Measurements

**Remove:**
```typescript
const [formStartTime] = useState(Date.now())
trackTiming('form', 'fill_time', Date.now() - formStartTime)
```

**Why:** PostHog autocapture + session recordings provide better timing insights without performance impact.

### Step 5: Replace TrackButton Components

**Remove:**
```typescript
<TrackButton
  trackEvent="button_clicked"
  trackProperties={{ context: 'property_form' }}
  onClick={handleSubmit}
>
  Save Property
</TrackButton>
```

**Replace with regular button:**
```typescript
<button onClick={handleSubmit}>Save Property</button>
```

**Why:** PostHog autocapture tracks button clicks automatically.

## Component-Specific Migration Examples

### Property Form Migration

**Before:** 7 tracking hooks, 150+ lines, complex timing
**After:** 1 hook, 50 lines, single strategic event

See: `property-form-simplified.tsx` for complete example.

### Tenant Form Migration

```typescript
// OLD
const { trackTenantCreated, trackFormSubmission } = useBusinessEvents()

const handleSubmit = async (data) => {
  try {
    const result = await onSubmit(data)
    trackTenantCreated({ tenant_id: result.id, ... })
    trackFormSubmission('tenant_form', true)
  } catch (error) {
    trackFormSubmission('tenant_form', false)
  }
}

// NEW  
const { track } = useAnalytics()

const handleSubmit = async (data) => {
  try {
    await onSubmit(data)
    track('tenant_added', {
      property_id: data.propertyId
    })
  } catch (error) {
    track('error_occurred', {
      error_message: error.message,
      feature_name: 'tenant_form'
    })
  }
}
```

## What PostHog Autocapture Handles

You don't need to manually track these anymore:

✅ **Automatic Tracking:**
- Page views
- Button clicks  
- Form submissions
- Input field changes
- Navigation events
- Scroll depth
- Session duration

✅ **Session Recordings:**
- User interaction flows
- Form fill timing
- Click heatmaps
- Error reproduction

## Business Metrics Focus

The simplified approach focuses on metrics that drive business decisions:

### Conversion Funnel
1. `user_signed_up` → User acquisition
2. `user_activated` → Product-market fit
3. `subscription_created` → Revenue conversion
4. Core feature usage → Feature adoption

### Feature Adoption
- `property_created` → Core workflow completion
- `tenant_added` → Feature depth usage
- `lease_generated` → Advanced feature usage

### Revenue Health
- `trial_started` / `trial_converted` → Conversion rate
- `payment_completed` / `payment_failed` → Payment success
- `subscription_cancelled` → Churn indicators

## Files to Remove After Migration

Once migration is complete, these files can be removed:

```
- components/analytics/track-button.tsx
- components/analytics/dashboard-metrics-tracker.tsx
- lib/analytics/business-events.ts (complex version)
- hooks/use-property-tracking.ts
- components/properties/property-form-with-tracking.tsx (replace with simplified)
```

## Testing the Migration

1. **Enable debug mode:**
```typescript
const { track } = useAnalytics({ debug: true })
```

2. **Verify essential events:**
   - Create property → Should log `property_created`
   - Add tenant → Should log `tenant_added`
   - Payment flow → Should log `payment_completed`

3. **Check PostHog dashboard:**
   - Events should appear in PostHog
   - Autocapture events should show page views, clicks
   - Session recordings should capture interactions

## Performance Benefits

- **Reduced JavaScript bundle size:** Fewer tracking components
- **Improved form performance:** No timing measurements
- **Faster page loads:** Less tracking logic execution
- **Better UX:** Focus on functionality over measurement

## Next Steps

1. Start with one component (e.g., property form)
2. Test in development with debug mode
3. Deploy to staging and verify events
4. Gradually migrate other components
5. Remove unused tracking files
6. Update documentation

The goal is cleaner code, better performance, and more actionable analytics.