# Stripe Sync Engine Complete Implementation Plan for TenantFlow

## PROJECT ANALYSIS

Based on analysis of your TenantFlow codebase, you already have excellent foundations in place:

✅ **Existing Infrastructure:**
- Supabase Stripe foreign tables already configured (`supabase/migrations/`)
- Comprehensive Stripe service layer (`apps/backend/src/stripe/`)
- Webhook handling infrastructure in place
- Payment system structure (`apps/backend/src/payments/`)
- Robust type system in `packages/shared/types/stripe.ts`
- Database schema with Stripe field integrations

## IMPLEMENTATION PLAN

### Phase 1: Enhanced Database Schema & Sync (2-3 hours)
**Goal:** Complete the Stripe Sync Engine foundation

1. **Expand Stripe Foreign Tables**
   - Add missing tables: `stripe_charges`, `stripe_payment_methods`, `stripe_setup_intents`
   - Create materialized views for performance
   - Add RLS policies for tenant isolation

2. **Enhanced Database Views**
   - Property revenue analytics view
   - Tenant payment history view  
   - Failed payment recovery view
   - MRR/ARR calculation views

3. **Database Migration Files**
   - `20250121_enhance_stripe_sync.sql` - Additional foreign tables
   - `20250121_stripe_analytics_views.sql` - Performance views
   - `20250121_stripe_rls_policies.sql` - Security policies

### Phase 2: Rent Payment System (4-5 hours)
**Goal:** Complete Issue #90 - Rent Payment System

1. **Enhanced Payment Services**
   - Extend existing `rent-payment.service.ts`
   - Add recurring rent charge creation
   - Implement failed payment retry logic
   - Add late fee calculations

2. **New API Endpoints**
   - `POST /api/payments/rent/setup` - Set up recurring rent
   - `POST /api/payments/retry/{paymentId}` - Retry failed payments
   - `GET /api/payments/history/{tenantId}` - Payment history
   - `POST /api/payments/methods` - Payment method management

3. **Database Integration**
   - Link `Lease` model to Stripe subscriptions
   - Connect `Tenant` model to Stripe customers
   - Track payment status in existing `RentPayment` model

### Phase 3: Enhanced Webhook System (2-3 hours)
**Goal:** Real-time Stripe data synchronization

1. **Webhook Handler Expansion**
   - Extend existing `webhook.service.ts`
   - Add all critical Stripe events (invoice.*, payment_intent.*, customer.*)
   - Implement proper error handling and retries
   - Add webhook signature validation

2. **Event Processing**
   - Payment success/failure notifications
   - Subscription status updates
   - Customer data synchronization
   - Invoice status tracking

### Phase 4: Frontend Components (3-4 hours)
**Goal:** Complete user interfaces for payment management

1. **Tenant Payment Portal**
   - Payment history component (uses existing patterns)
   - Payment method management
   - Upcoming charges display
   - Failed payment resolution UI

2. **Landlord Financial Dashboard**
   - Revenue analytics components
   - Payment failure alerts
   - Tenant payment status overview
   - Financial reporting widgets

3. **Component Integration**
   - Extend existing dashboard components
   - Add to existing tenant portal structure
   - Use established design system patterns

### Phase 5: Advanced Analytics & Reporting (2-3 hours)
**Goal:** Comprehensive financial insights

1. **API Endpoints**
   - `GET /api/analytics/revenue` - Property-level revenue
   - `GET /api/analytics/payment-rates` - Success/failure rates
   - `GET /api/analytics/mrr` - Monthly recurring revenue
   - `GET /api/reports/financial/{propertyId}` - Property financial reports

2. **Database Queries**
   - Optimized revenue aggregation queries
   - Payment success rate calculations
   - Delinquency tracking queries
   - Cash flow projection algorithms

### Phase 6: Automated Workflows (2-3 hours)
**Goal:** Automated payment reminders and notifications

1. **Email Automation**
   - Extend existing email service
   - Payment reminder templates
   - Failed payment notifications
   - Successful payment confirmations

2. **Notification System**
   - Integrate with existing notification infrastructure
   - Real-time payment status updates
   - Dashboard alerts for landlords
   - Tenant communication automation

## TECHNICAL IMPLEMENTATION DETAILS

### Key File Modifications:

1. **Database Layer:**
   - Extend `packages/database/prisma/schema.prisma` with enhanced Stripe relationships
   - Add Supabase migrations for foreign tables and views

2. **Backend Services:**
   - Enhance `apps/backend/src/stripe/stripe.service.ts`
   - Expand `apps/backend/src/payments/services/rent-payment.service.ts`
   - Extend `apps/backend/src/stripe/webhook.service.ts`

3. **Frontend Components:**
   - Add to `apps/frontend/src/components/billing/`
   - Extend `apps/frontend/src/components/dashboard/`
   - New payment components in tenant portal

4. **Shared Types:**
   - Enhance `packages/shared/src/types/stripe.ts`
   - Add payment analytics types
   - Extend API response types

### Integration Points:

1. **Existing Services Integration:**
   - Leverage existing `BaseCrudService` pattern
   - Use established error handling (`ErrorHandlerService`)
   - Integrate with current authentication system

2. **Database Relationships:**
   - `tenants.stripeCustomerId` → `stripe_customers.id`
   - `properties.id` → subscription metadata
   - `leases.stripeSubscriptionId` → `stripe_subscriptions.id`

### Performance Optimizations:

1. **Database Indexes:**
   - Add indexes on foreign key relationships
   - Materialized views for complex analytics queries
   - Proper RLS policy optimization

2. **Caching Strategy:**
   - Cache Stripe data locally for 5-minute intervals
   - Use existing Redis cache infrastructure
   - Implement query result caching

## ENVIRONMENT VARIABLES REQUIRED

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # or sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... # or pk_test_...

# Supabase Configuration (existing)
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
```

## DETAILED IMPLEMENTATION SPECIFICATIONS

### Database Schema Enhancements

#### Additional Foreign Tables Needed:
```sql
-- Stripe Charges (for payment tracking)
CREATE FOREIGN TABLE stripe_charges (
  id text,
  amount bigint,
  currency text,
  customer text,
  payment_intent text,
  status text,
  created bigint,
  paid boolean,
  refunded boolean,
  receipt_url text,
  metadata jsonb,
  attrs jsonb
) SERVER stripe_server OPTIONS (object 'charges');

-- Stripe Payment Methods
CREATE FOREIGN TABLE stripe_payment_methods (
  id text,
  customer text,
  type text,
  card jsonb,
  created bigint,
  metadata jsonb,
  attrs jsonb
) SERVER stripe_server OPTIONS (object 'payment_methods');
```

#### Analytics Views:
```sql
-- Property Revenue View
CREATE VIEW property_revenue AS
SELECT 
  p.id as property_id,
  p.address,
  SUM(sc.amount) as total_revenue,
  COUNT(sc.id) as payment_count,
  AVG(sc.amount) as avg_payment
FROM properties p
JOIN tenants t ON t.property_id = p.id
JOIN stripe_charges sc ON sc.customer = t.stripe_customer_id
WHERE sc.paid = true
GROUP BY p.id, p.address;

-- Monthly Recurring Revenue (MRR) View
CREATE VIEW monthly_recurring_revenue AS
SELECT 
  DATE_TRUNC('month', to_timestamp(ss.current_period_start)) as month,
  SUM(sp.unit_amount) as mrr,
  COUNT(ss.id) as active_subscriptions
FROM stripe_subscriptions ss
JOIN stripe_prices sp ON sp.id = (ss.attrs->>'default_price_id')::text
WHERE ss.status IN ('active', 'trialing')
GROUP BY DATE_TRUNC('month', to_timestamp(ss.current_period_start));
```

### API Endpoint Specifications

#### Rent Payment APIs:
```typescript
// POST /api/payments/rent/setup
interface SetupRentPaymentRequest {
  tenantId: string;
  leaseId: string;
  amount: number; // in cents
  dueDate: number; // day of month (1-31)
  paymentMethodId?: string;
}

// POST /api/payments/retry/{paymentId}
interface RetryPaymentRequest {
  paymentIntentId: string;
  paymentMethodId?: string;
}

// GET /api/payments/history/{tenantId}
interface PaymentHistoryResponse {
  payments: PaymentRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}
```

#### Analytics APIs:
```typescript
// GET /api/analytics/revenue
interface RevenueAnalyticsResponse {
  totalRevenue: number;
  monthlyRevenue: MonthlyRevenue[];
  propertyBreakdown: PropertyRevenue[];
  paymentSuccessRate: number;
}

// GET /api/analytics/mrr
interface MRRResponse {
  currentMrr: number;
  mrrGrowth: number;
  historicalMrr: MRRDataPoint[];
  churnRate: number;
}
```

### Frontend Component Specifications

#### Payment History Component:
```typescript
interface PaymentHistoryProps {
  tenantId: string;
  limit?: number;
  showFilters?: boolean;
}

// Usage in tenant portal
<PaymentHistory 
  tenantId={currentTenant.id}
  limit={10}
  showFilters={true}
/>
```

#### Revenue Analytics Component:
```typescript
interface RevenueChartProps {
  propertyId?: string;
  dateRange: [Date, Date];
  chartType: 'bar' | 'line' | 'area';
}

// Usage in landlord dashboard
<RevenueChart 
  propertyId={selectedProperty.id}
  dateRange={[startDate, endDate]}
  chartType="area"
/>
```

### Webhook Event Handling

#### Critical Stripe Events to Handle:
```typescript
const criticalEvents = [
  // Payment Events
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'charge.succeeded',
  'charge.failed',
  
  // Invoice Events
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'invoice.created',
  'invoice.finalized',
  
  // Subscription Events
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  
  // Customer Events
  'customer.created',
  'customer.updated',
  'customer.deleted',
  
  // Payment Method Events
  'payment_method.attached',
  'payment_method.detached'
];
```

### Security Considerations

#### Row Level Security (RLS) Policies:
```sql
-- Tenant can only access their own payment data
CREATE POLICY tenant_payment_access ON stripe_charges
FOR SELECT
TO authenticated
USING (
  customer IN (
    SELECT stripe_customer_id 
    FROM tenants 
    WHERE organization_id = auth.jwt() ->> 'organization_id'
    AND user_id = auth.uid()
  )
);

-- Property owners can access payments for their tenants
CREATE POLICY owner_tenant_payment_access ON stripe_charges
FOR SELECT
TO authenticated
USING (
  customer IN (
    SELECT t.stripe_customer_id 
    FROM tenants t
    JOIN properties p ON p.id = t.property_id
    WHERE p.organization_id = auth.jwt() ->> 'organization_id'
  )
);
```

#### API Security:
- All payment endpoints require authentication
- Stripe webhook signature validation
- Rate limiting on payment retry attempts
- PCI compliance considerations for payment data

### Testing Strategy

#### Unit Tests:
```typescript
// Test payment service logic
describe('RentPaymentService', () => {
  it('should create recurring rent subscription', async () => {
    // Test implementation
  });
  
  it('should handle payment failures gracefully', async () => {
    // Test implementation
  });
  
  it('should calculate late fees correctly', async () => {
    // Test implementation
  });
});
```

#### Integration Tests:
```typescript
// Test Stripe webhook processing
describe('StripeWebhookService', () => {
  it('should process payment_intent.succeeded event', async () => {
    // Test implementation
  });
  
  it('should sync customer data on customer.updated event', async () => {
    // Test implementation
  });
});
```

#### E2E Tests:
```typescript
// Test complete payment flow
test('Complete rent payment flow', async ({ page }) => {
  // 1. Login as tenant
  // 2. Navigate to payment section
  // 3. Add payment method
  // 4. Make payment
  // 5. Verify payment success
  // 6. Check payment history
});
```

## SUCCESS CRITERIA

✅ **Functional Requirements:**
- Complete rent payment automation system
- Real-time Stripe data synchronization
- Comprehensive payment analytics dashboard
- Automated payment reminder workflows
- Failed payment recovery system
- Multi-tenant payment isolation

✅ **Technical Requirements:**
- Sub-second query performance on financial data
- 100% webhook reliability with retry mechanisms
- Type-safe API contracts throughout
- Production-ready error handling
- PCI compliance considerations
- Comprehensive test coverage (>80%)

✅ **Business Impact:**
- Resolve Issue #90 (Rent Payment System)
- Enable landlord revenue insights
- Automate tenant payment workflows
- Provide financial reporting capabilities
- Reduce payment processing overhead
- Improve cash flow management

✅ **Performance Targets:**
- Webhook processing < 5 seconds
- Dashboard queries < 100ms
- Payment UI interactions < 50ms
- 99.9% uptime for payment processing
- Support for 10,000+ concurrent payment operations

## ESTIMATED TIMELINE: 15-20 hours total

**Phase Breakdown:**
- Phase 1 (Database): 2-3 hours
- Phase 2 (Rent Payments): 4-5 hours  
- Phase 3 (Webhooks): 2-3 hours
- Phase 4 (Frontend): 3-4 hours
- Phase 5 (Analytics): 2-3 hours
- Phase 6 (Automation): 2-3 hours

## DEPLOYMENT CHECKLIST

### Pre-Deployment:
- [ ] Supabase Stripe wrapper enabled
- [ ] Stripe API keys configured in vault
- [ ] Foreign tables created and accessible
- [ ] RLS policies applied and tested
- [ ] Webhook endpoint SSL certificate valid

### Post-Deployment:
- [ ] Webhook endpoints registered in Stripe dashboard
- [ ] Test payments processed successfully
- [ ] Analytics views returning correct data
- [ ] Email notifications working
- [ ] Error monitoring configured
- [ ] Performance monitoring active

---

**This implementation leverages your existing excellent architecture while adding the missing payment system functionality. The Stripe Sync Engine will transform TenantFlow into a complete property management financial platform.**

## NEXT STEPS

When ready to implement:
1. **Enable Stripe Sync in Supabase** - Configure the wrapper with your API keys
2. **Start with Phase 1** - Database enhancements provide the foundation
3. **Implement incrementally** - Each phase builds on the previous
4. **Test thoroughly** - Use the comprehensive testing strategy outlined
5. **Monitor in production** - Implement observability from day one

This plan is designed to be implemented in stages, allowing for testing and validation at each step while maintaining production stability.