/**
 * Billing constants
 * Runtime constants and enums for billing and subscription management
 */
export const PLAN_TYPE = {
    FREE: 'FREE',
    STARTER: 'STARTER',
    GROWTH: 'GROWTH',
    ENTERPRISE: 'ENTERPRISE'
};
export const PLAN_TYPE_OPTIONS = Object.values(PLAN_TYPE);
export const BILLING_PERIOD = {
    MONTHLY: 'MONTHLY',
    ANNUAL: 'ANNUAL'
};
export const BILLING_PERIOD_OPTIONS = Object.values(BILLING_PERIOD);
export const SUB_STATUS = {
    ACTIVE: 'ACTIVE',
    CANCELLED: 'CANCELLED',
    PAST_DUE: 'PAST_DUE',
    UNPAID: 'UNPAID',
    INCOMPLETE: 'INCOMPLETE',
    INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
    TRIALING: 'TRIALING',
    PAUSED: 'PAUSED'
};
export const SUB_STATUS_OPTIONS = Object.values(SUB_STATUS);
