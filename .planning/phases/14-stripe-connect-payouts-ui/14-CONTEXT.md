# Phase 14: Stripe Connect & Payouts UI - Context

## Phase Overview

**Goal**: Build Connect account onboarding and payout management dashboard for property owners
**Depends on**: Phase 13 (Frontend Checkout & Subscriptions)
**Status**: Ready to execute

## Current State Analysis

### What Already Exists

**Backend (Complete):**
- `ConnectSetupService` - Account creation and onboarding
- `ConnectBillingService` - Customer/subscription management
- `ConnectPayoutsService` - Balance, payouts, transfers
- `ConnectController` - All necessary endpoints
- `PayoutsController` - Payout and transfer listing

**Endpoints Available:**
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/stripe/connect/onboard` | POST | Create account + start onboarding |
| `/stripe/connect/refresh-link` | POST | Refresh onboarding URL |
| `/stripe/connect/status` | GET | Get onboarding/verification status |
| `/stripe/connect/account` | GET | Get account details |
| `/stripe/connect/dashboard-link` | POST | Get Stripe dashboard login |
| `/stripe/connect/balance` | GET | Get available/pending balance |
| `/stripe/connect/payouts` | GET | List payouts with pagination |
| `/stripe/connect/payouts/:id` | GET | Get payout details |
| `/stripe/connect/transfers` | GET | List rent payment transfers |

**Frontend Hooks (Complete):**
- `useConnectedAccount()` - Fetch account details
- `useCreateConnectedAccountMutation()` - Create account
- `useRefreshOnboardingMutation()` - Refresh onboarding link
- `useConnectedAccountBalance()` - Get balance
- `useConnectedAccountPayouts()` - List payouts
- `useConnectedAccountTransfers()` - List transfers

**Existing UI:**
- `stripe-connect-onboarding.tsx` - Basic dialog for creating account
- `stripe-connect-tab.tsx` - Settings tab with Connect info
- `/financials/payouts/page.tsx` - Payouts dashboard (435 lines, basic)

### What's Missing (UI Focus)

1. **Enhanced Connect Onboarding**
   - Multi-step wizard with progress indicator
   - Country/entity type selection with guidance
   - Requirements preview before Stripe redirect

2. **Account Status Dashboard**
   - Verification status breakdown
   - Requirements tracking with action items
   - Capability indicators (charges/payouts enabled)

3. **Payout Details**
   - Payout breakdown modal showing line items
   - Transfer details with tenant/lease info
   - Fee breakdown display

4. **Payout Configuration**
   - View current payout schedule
   - Manual payout request button
   - Payout method display

## Database Schema

`stripe_connected_accounts` table:
- `user_id` - FK to users
- `stripe_account_id` - Express account ID
- `business_name`, `business_type`, `tax_id`
- `charges_enabled`, `payouts_enabled` - Capability flags
- `onboarding_status` - pending/in_progress/complete
- `requirements_due` - Array of required verification items
- `default_platform_fee_percent` - Revenue sharing

## Key Files

**Backend:**
- `apps/backend/src/modules/billing/connect/connect.controller.ts`
- `apps/backend/src/modules/billing/connect/payouts.controller.ts`
- `apps/backend/src/modules/billing/connect/connect-setup.service.ts`
- `apps/backend/src/modules/billing/connect/connect-payouts.service.ts`

**Frontend:**
- `apps/frontend/src/hooks/api/use-stripe-connect.ts`
- `apps/frontend/src/app/(owner)/financials/payouts/page.tsx`
- `apps/frontend/src/components/settings/stripe-connect-onboarding.tsx`
- `apps/frontend/src/components/settings/stripe-connect-tab.tsx`

## Phase Scope

Since backend and hooks are complete, Phase 14 focuses on **UI enhancements only**:

1. **Plan 14-01**: Connect Account Status Dashboard
   - Account overview card with status indicators
   - Verification requirements display
   - Quick actions (dashboard link, refresh onboarding)

2. **Plan 14-02**: Enhanced Payouts Dashboard
   - Payout details modal
   - Transfer details with tenant info
   - Export functionality

## Success Criteria

- Property owners can see their Connect account status
- Verification requirements are clearly displayed
- Payout history shows detailed breakdowns
- Transfer details link to tenants/leases
- All UI states handle loading/error gracefully
