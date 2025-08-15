# Comprehensive Stripe API Documentation for TenantFlow

This document provides complete documentation for all Stripe objects and APIs used in TenantFlow, based on official Stripe API documentation and enhanced with TenantFlow-specific implementations.

## Table of Contents

1. [Core Objects](#core-objects)
2. [Payment Processing](#payment-processing)
3. [Billing & Invoicing](#billing--invoicing)
4. [Error Handling](#error-handling)
5. [Webhooks](#webhooks)
6. [TenantFlow-Specific Implementation](#tenantflow-specific-implementation)

## Core Objects

### Subscriptions

The backbone of TenantFlow's billing system, handling recurring payments for our 4-tier plan structure.

**Key Features:**
- Trial management (14-day free trials)
- Automatic payment collection
- Proration handling for plan changes
- Subscription lifecycle management

**TenantFlow Plans:**
- `FREETRIAL`: 14-day trial period
- `STARTER`: Basic property management features
- `GROWTH`: Advanced features with more units
- `TENANTFLOW_MAX`: Enterprise-grade features

**Implementation Location:** `/packages/shared/src/types/stripe-subscription-enhanced.ts`

### Customers

Represents property management companies using TenantFlow.

**Key Features:**
- Contact information management
- Payment method storage
- Billing address handling
- Tax ID collection

**Implementation Location:** `/packages/shared/src/types/stripe-core-objects.ts`

### Products & Prices

Defines TenantFlow's subscription offerings and pricing structure.

**Key Features:**
- Monthly and annual billing cycles
- Lookup keys for easy plan identification
- Tax behavior configuration
- Metadata for plan categorization

**Implementation Location:** `/packages/shared/src/types/stripe-core-objects.ts`

### Invoices

Billing documents generated for subscription charges and one-time payments.

**Key Features:**
- Automatic tax calculation
- Payment collection management
- Custom fields for organization details
- PDF generation and hosting

**Implementation Location:** `/packages/shared/src/types/stripe-core-objects.ts`

### Invoice Line Items

Individual charges and fees within invoices, including tax and discount calculations.

**Key Features:**
- Proration handling for mid-cycle changes
- Tax amount breakdown
- Discount application
- Period-based billing

**Implementation Location:** `/packages/shared/src/types/stripe-invoice-line-items.ts`

## Payment Processing

### Payment Methods

Customer payment instruments including cards and bank accounts.

**Supported Types:**
- Credit/debit cards (Visa, Mastercard, Amex, etc.)
- US bank accounts (ACH)
- SEPA Direct Debit (EU)
- Digital wallets (Apple Pay, Google Pay)

**Implementation Location:** `/packages/shared/src/types/stripe-payment-objects.ts`

### Checkout Sessions

Secure payment collection interface for subscription signups.

**Key Features:**
- Subscription mode with trial handling
- Automatic customer creation
- Tax collection and calculation
- Success/cancel URL handling

**Implementation Location:** `/packages/shared/src/types/stripe-payment-objects.ts`

### Customer Portal Sessions

Self-service billing management for customers.

**Key Features:**
- Payment method updates
- Invoice history access
- Subscription management
- Download receipts and invoices

**Implementation Location:** `/packages/shared/src/types/stripe-payment-objects.ts`

### Payment Intents

Represents payment processing attempts with comprehensive status tracking.

**Key Features:**
- 3D Secure authentication
- Automatic payment method confirmation
- Capture method configuration
- Comprehensive error handling

**Implementation Location:** `/packages/shared/src/types/stripe-payment-objects.ts`

### Setup Intents

Used for saving payment methods without immediate charges.

**Key Features:**
- Future payment setup
- Strong Customer Authentication compliance
- Payment method verification
- Off-session usage preparation

**Implementation Location:** `/packages/shared/src/types/stripe-payment-objects.ts`

## Billing & Invoicing

### Automatic Tax

TenantFlow leverages Stripe's automatic tax calculation for compliance.

**Features:**
- Global tax rate determination
- VAT, GST, and sales tax support
- Tax-exempt customer handling
- Detailed tax reporting

### Payment Collection

Configurable payment collection methods for different customer needs.

**Methods:**
- `charge_automatically`: Automatic payment collection
- `send_invoice`: Manual payment via invoice

### Subscription Lifecycle

Complete subscription management from creation to cancellation.

**States:**
- `trialing`: Free trial period
- `active`: Paying subscription
- `past_due`: Payment failed, retry in progress
- `canceled`: Subscription terminated
- `unpaid`: Payment permanently failed

## Error Handling

### Error Types

Comprehensive error handling with user-friendly messaging.

**Error Categories:**
- `card_error`: Payment card issues (most common)
- `invalid_request_error`: Bad request parameters
- `api_error`: Stripe service issues
- `idempotency_error`: Duplicate request issues

**Implementation Location:** `/packages/shared/src/types/stripe-errors.ts`

### Decline Codes

Detailed card decline reasons with actionable user guidance.

**Common Decline Codes:**
- `insufficient_funds`: Card has insufficient balance
- `expired_card`: Card has expired
- `incorrect_cvc`: Wrong security code
- `generic_decline`: General decline without specific reason

### Error Recovery

Best practices for handling and recovering from payment errors.

**Strategies:**
- Exponential backoff for retryable errors
- User-friendly error messages
- Alternative payment method suggestions
- Support contact guidance

## Webhooks

### Event Handling

Secure webhook processing for real-time updates.

**Critical Events:**
- `customer.subscription.created`: New subscription
- `customer.subscription.updated`: Plan changes
- `invoice.payment_succeeded`: Successful payment
- `invoice.payment_failed`: Payment failure

**Implementation Location:** `/packages/shared/src/types/stripe-payment-objects.ts`

### Webhook Endpoints

Configuration and management of webhook endpoints.

**Features:**
- Event type filtering
- Signature verification
- Retry logic handling
- Status monitoring

**Implementation Location:** `/packages/shared/src/types/stripe-webhook-endpoints.ts`

### Security

Webhook security implementation for TenantFlow.

**Security Measures:**
- Signature verification using webhook secrets
- Idempotency key handling
- Event deduplication
- Request validation

## TenantFlow-Specific Implementation

### Metadata Standards

Consistent metadata structure across all Stripe objects.

```typescript
interface TenantFlowStripeMetadata {
  tenantflow_organization_id?: string
  tenantflow_user_id?: string
  tenantflow_plan_type?: 'FREETRIAL' | 'STARTER' | 'GROWTH' | 'TENANTFLOW_MAX'
  tenantflow_billing_interval?: 'monthly' | 'annual'
  tenantflow_source?: string
  tenantflow_environment?: 'development' | 'staging' | 'production'
}
```

### Plan Hierarchy

TenantFlow's subscription structure with feature differentiation.

**Plan Features:**
- **FREETRIAL**: 14-day trial, limited features
- **STARTER**: Basic property management, up to 50 units
- **GROWTH**: Advanced features, up to 200 units
- **TENANTFLOW_MAX**: Enterprise features, unlimited units

### Integration Patterns

Common integration patterns used throughout TenantFlow.

**Subscription Creation:**
1. Create or retrieve customer
2. Create checkout session with trial
3. Handle successful payment webhook
4. Provision account features

**Plan Changes:**
1. Calculate proration
2. Update subscription with new price
3. Handle immediate charge if needed
4. Update feature access

**Payment Failures:**
1. Retry with exponential backoff
2. Notify customer via email
3. Restrict account access if needed
4. Provide recovery options

### Security Considerations

Security best practices implemented in TenantFlow.

**Data Protection:**
- PCI DSS compliance through Stripe
- No sensitive payment data storage
- Encrypted webhook payloads
- Access token rotation

**Fraud Prevention:**
- Radar fraud detection
- Risk assessment integration
- Chargeback protection
- Dispute management

## Type Definitions

All type definitions are available through the comprehensive index:

```typescript
import { 
  StripeSubscription,
  StripeCustomer,
  StripeInvoice,
  StripePaymentMethod,
  StripeError
} from '@repo/shared/types/stripe-index'
```

### Available Type Collections

- **Core Objects**: Customer, Price, Product, Invoice, Customer Session
- **Subscriptions**: Subscription, Subscription Item, Subscription Schedule
- **Payments**: Payment Method, Payment Intent, Setup Intent, Checkout Session
- **Billing**: Invoice, Invoice Line Item, Tax Rates, Discounts
- **Errors**: All error types with user-friendly messaging
- **Webhooks**: Event objects and endpoint configuration
- **Utilities**: Type guards, validation functions, helper methods

## Best Practices

### Error Handling
- Always provide user-friendly error messages
- Implement retry logic for transient failures
- Log detailed error information for debugging
- Offer alternative payment methods when appropriate

### Webhook Processing
- Verify webhook signatures
- Handle events idempotently
- Process events asynchronously
- Monitor webhook endpoint health

### Subscription Management
- Handle trial periods appropriately
- Calculate prorations correctly
- Notify customers of upcoming charges
- Provide clear billing information

### Security
- Never store sensitive payment data
- Use environment-specific API keys
- Implement proper access controls
- Monitor for suspicious activity

## Support and Resources

### TenantFlow Implementation
- Backend service: `/apps/backend/src/stripe/`
- Type definitions: `/packages/shared/src/types/stripe-*`
- Documentation: `/packages/shared/src/docs/stripe-*`

### Official Stripe Resources
- [Stripe API Documentation](https://docs.stripe.com/api)
- [Stripe Dashboard](https://dashboard.stripe.com)
- [Webhook Testing](https://dashboard.stripe.com/test/webhooks)
- [Event Types Reference](https://docs.stripe.com/api/events/types)

This documentation provides a comprehensive foundation for working with Stripe in TenantFlow, covering all implemented features and providing guidance for future development.