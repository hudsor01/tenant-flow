# Stripe Foreign Data Wrapper Integration

This document describes the implementation of Stripe Foreign Data Wrapper (FDW) integration in the TenantFlow backend. The FDW allows you to query Stripe data directly from your Supabase PostgreSQL database using secure RPC functions.

## Overview

The Stripe FDW integration consists of:

1. **Foreign Data Wrapper Setup**: PostgreSQL extension that connects to Stripe API
2. **Foreign Tables**: Virtual tables that map to Stripe API endpoints
3. **Views**: Simplified interfaces with proper type conversion
4. **RPC Functions**: Secure Postgres functions for querying Stripe data
5. **Service Layer**: TypeScript services using RPC calls for application integration
6. **API Controllers**: REST endpoints for accessing Stripe analytics

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend API   │    │   Supabase DB   │
│                 │───▶│                 │───▶│                 │
│ Analytics UI    │    │ RPC Functions   │    │ Foreign Tables  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
                                              ┌─────────────────┐
                                              │   Stripe API    │
                                              │                 │
                                              │ Live Data       │
                                              └─────────────────┘
```

## Setup Instructions

### 1. Apply the Stripe FDW Database Schema

First, you need to set up the foreign data wrapper, tables, and views. Apply the SQL from the previous setup, then apply the RPC functions:

```bash
# Apply the RPC functions to your Supabase database
# Copy and execute the contents of: src/stripe/sql/stripe-fdw-functions.sql
```

This creates the following RPC functions:
- `get_stripe_customers(limit_count)`
- `get_stripe_customer_by_id(customer_id)`
- `get_stripe_subscriptions(customer_id, limit_count)`
- `get_stripe_payment_intents(customer_id, limit_count)`
- `get_stripe_products(active_only, limit_count)`
- `get_stripe_prices(product_id, active_only, limit_count)`
- `get_stripe_subscription_analytics()`
- `execute_stripe_fdw_query(sql_query)` (admin only)

### 2. Configure Environment Variables

Ensure your Supabase environment variables are properly set:

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
STRIPE_SECRET_KEY=your_stripe_secret_key
```

### 3. Import the Service

The `StripeFdwService` is already registered in the `StripeModule`. You can inject it into your services:

```typescript
import { StripeFdwService } from './stripe-fdw.service'

@Injectable()
export class MyService {
  constructor(private readonly stripeFdw: StripeFdwService) {}
}
```

## Usage Examples

### 1. Using the Service Layer

```typescript
import { StripeFdwService } from './stripe-fdw.service'

@Injectable()
export class AnalyticsService {
  constructor(private readonly stripeFdw: StripeFdwService) {}

  async getCustomerAnalytics(customerId: string) {
    // Get complete customer payment history via RPC
    const history = await this.stripeFdw.getCustomerPaymentHistory(customerId)
    
    return {
      customer: history.customer,
      totalSubscriptions: history.subscriptions.length,
      activeSubscriptions: history.subscriptions.filter(s => s.status === 'active').length,
      totalPayments: history.paymentIntents.length,
      totalRevenue: history.paymentIntents
        .filter(pi => pi.status === 'succeeded')
        .reduce((sum, pi) => sum + (pi.amount || 0), 0)
    }
  }

  async getDashboardMetrics() {
    // Get subscription analytics
    const analytics = await this.stripeFdw.getSubscriptionAnalytics()
    
    // Get recent customers
    const recentCustomers = await this.stripeFdw.getCustomers(10)
    
    // Get recent payment intents
    const recentPayments = await this.stripeFdw.getPaymentIntents(undefined, 10)
    
    return {
      subscriptions: analytics,
      recentCustomers,
      recentPayments
    }
  }
}
```

### 2. Using the Analytics API

The `StripeAnalyticsController` provides REST endpoints (admin only):

```bash
# Get all customers
GET /stripe-analytics/customers?limit=100

# Get specific customer
GET /stripe-analytics/customers/cus_example123

# Get customer payment history
GET /stripe-analytics/customers/cus_example123/payment-history

# Get subscription analytics
GET /stripe-analytics/subscriptions/analytics

# Get all payment intents for a customer
GET /stripe-analytics/payment-intents?customer_id=cus_example123

# Get all products
GET /stripe-analytics/products?active_only=true

# Get prices for a specific product
GET /stripe-analytics/products/prod_example123/prices
```

### 3. Custom Queries (Admin Only)

For advanced use cases, you can execute custom SQL queries:

```typescript
async getCustomAnalytics() {
  const query = `
    SELECT 
      DATE_TRUNC('month', created_at) as month,
      COUNT(*) as customer_count,
      COUNT(*) FILTER (WHERE metadata->>'plan' = 'premium') as premium_count
    FROM stripe_fdw.v_customers 
    WHERE created_at >= NOW() - INTERVAL '12 months'
    GROUP BY month
    ORDER BY month DESC
  `
  
  return await this.stripeFdw.executeCustomQuery(query)
}
```

## TypeScript Interfaces

The service uses strongly-typed interfaces for all Stripe data:

```typescript
export interface StripeCustomerFDW {
  id: string
  email: string
  name: string
  description?: string
  phone?: string
  currency?: string
  balance?: number
  delinquent?: boolean
  livemode?: boolean
  metadata?: Record<string, any>
  created_at?: Date
}

export interface StripeSubscriptionFDW {
  id: string
  customer_id: string
  status: string
  cancel_at_period_end?: boolean
  currency?: string
  default_payment_method?: string
  description?: string
  livemode?: boolean
  metadata?: Record<string, any>
  created_at?: Date
  current_period_start?: Date
  current_period_end?: Date
  trial_end?: Date
}

export interface StripePaymentIntentFDW {
  id: string
  amount: number
  currency: string
  customer_id?: string
  status: string
  description?: string
  receipt_email?: string
  livemode?: boolean
  metadata?: Record<string, any>
  created_at?: Date
}
```

## Security Considerations

### RPC Function Security

1. **SECURITY DEFINER**: All functions run with elevated privileges to access foreign tables
2. **Permission Grants**: Only `authenticated` users can call most functions
3. **Admin Only**: `execute_stripe_fdw_query` is restricted to `service_role`
4. **SQL Injection Protection**: Custom query function validates input and prevents destructive operations

### Access Control

- All endpoints require authentication via `JwtAuthGuard`
- Analytics endpoints require `ADMIN` role via `RolesGuard`
- Foreign tables are not directly accessible from the application layer

### Data Protection

- No sensitive Stripe data is stored in your database
- All queries fetch live data from Stripe API
- Metadata and custom fields are preserved as JSON

## Performance Considerations

### Caching Strategy

Since FDW queries hit the Stripe API directly, consider implementing caching:

```typescript
@Injectable()
export class CachedStripeService {
  constructor(
    private readonly stripeFdw: StripeFdwService,
    private readonly cache: CacheService
  ) {}

  async getCachedCustomers(limit = 50): Promise<StripeCustomerFDW[]> {
    const cacheKey = `stripe:customers:${limit}`
    
    let customers = await this.cache.get(cacheKey)
    if (!customers) {
      customers = await this.stripeFdw.getCustomers(limit)
      await this.cache.set(cacheKey, customers, 300) // 5 minutes
    }
    
    return customers
  }
}
```

### Query Optimization

- Use appropriate limits to avoid large data transfers
- Filter at the database level rather than in application code
- Consider pagination for large datasets

### Rate Limiting

- Stripe API has rate limits - monitor usage
- Implement exponential backoff for failed requests
- Consider batching related queries

## Troubleshooting

### Common Issues

1. **TypeScript Compilation Errors**: Ensure RPC functions are deployed before running the application
2. **Permission Denied**: Verify user has appropriate role for analytics endpoints
3. **FDW Connection Failed**: Check Stripe API key configuration
4. **Function Not Found**: Ensure SQL functions are properly deployed to Supabase

### Debugging

Enable detailed logging in the service:

```typescript
// Set LOG_LEVEL=debug in environment
this.logger.debug('Executing Stripe FDW query', { query, params })
```

### Monitoring

Monitor FDW performance and errors:

```sql
-- Check function execution stats
SELECT 
  schemaname,
  funcname,
  calls,
  total_time,
  mean_time
FROM pg_stat_user_functions 
WHERE funcname LIKE 'get_stripe_%'
ORDER BY total_time DESC;
```

## Next Steps

1. **Implement Caching**: Add Redis caching for frequently accessed data
2. **Add Monitoring**: Set up alerts for FDW query failures
3. **Extend Analytics**: Create more specific RPC functions for common queries
4. **Performance Tuning**: Optimize query patterns based on usage metrics
5. **Documentation**: Add API documentation for analytics endpoints

## Files

- `stripe-fdw.service.ts` - Main service using RPC calls
- `stripe-analytics.controller.ts` - REST API endpoints
- `sql/stripe-fdw-functions.sql` - Postgres RPC functions
- `README-STRIPE-FDW.md` - This documentation

## Support

For issues with the Stripe FDW integration:

1. Check Supabase FDW documentation
2. Verify Stripe API connectivity
3. Review function logs in Supabase dashboard
4. Test individual RPC functions in SQL editor