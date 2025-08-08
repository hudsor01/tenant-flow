# Pricing Components - Next.js 15 Architecture

## Overview

This directory contains the refactored pricing page components following Next.js 15 best practices. The original 460+ line monolithic client component has been broken down into focused, reusable components.

## Architecture

### Server Components (Static, SEO-friendly)
- **`pricing-header.tsx`** - Static header content
- **`pricing-grid.tsx`** - Layout wrapper for pricing cards  
- **`trust-badges.tsx`** - Static trust indicators
- **`page.tsx`** - Main server component orchestrating the layout

### Client Components (Interactive only)
- **`billing-toggle.tsx`** - Interactive billing interval toggle
- **`pricing-plan-card.tsx`** - Individual plan cards with buttons
- **`pricing-faq.tsx`** - Collapsible FAQ accordion
- **`pricing-page-client.tsx`** - Client wrapper managing auth & state

### Data & Configuration
- **`pricing-data.ts`** - Centralized plan configuration
- **`index.ts`** - Clean component exports

## Performance Optimizations

1. **Static Generation**: Main page uses `force-static` for instant loading
2. **Component Separation**: Server components rendered at build time
3. **Selective Hydration**: Only interactive components are hydrated
4. **Icon Serialization**: Icons passed as string names to avoid serialization issues

## Component Hierarchy

```
app/pricing/page.tsx (Server Component)
├── PricingHeader (Server Component)
└── PricingPageClient (Client Component)
    ├── BillingToggle (Client Component)
    ├── PricingGrid (Server Component)
    │   └── PricingPlanCard[] (Client Components)
    ├── TrustBadges (Server Component)
    └── PricingFAQ (Client Component)
```

## Key Benefits

- **Reduced Bundle Size**: Only interactive components are shipped to client
- **Better SEO**: Server components are pre-rendered with content
- **Improved Performance**: Static generation + selective hydration
- **Maintainability**: Focused, single-responsibility components
- **Type Safety**: Proper TypeScript interfaces throughout
- **Reusability**: Components can be reused in other parts of the app

## Migration from Legacy

The refactored components maintain full backward compatibility with existing Stripe integration and authentication flows while providing a cleaner, more performant architecture.