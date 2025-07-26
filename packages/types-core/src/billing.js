export const PLAN_TYPE = {
    FREE: 'FREE',
    STARTER: 'STARTER',
    GROWTH: 'GROWTH',
    ENTERPRISE: 'ENTERPRISE'
};
export const BILLING_PERIOD = {
    MONTHLY: 'MONTHLY',
    ANNUAL: 'ANNUAL'
};
export const SUB_STATUS = {
    ACTIVE: 'ACTIVE',
    CANCELLED: 'CANCELLED',
    PAST_DUE: 'PAST_DUE',
    INCOMPLETE: 'INCOMPLETE',
    INCOMPLETE_EXPIRED: 'INCOMPLETE_EXPIRED',
    TRIALING: 'TRIALING',
    UNPAID: 'UNPAID'
};
export const STRIPE_ERRORS = {
    CARD_DECLINED: 'card_declined',
    EXPIRED_CARD: 'expired_card',
    INSUFFICIENT_FUNDS: 'insufficient_funds',
    PROCESSING_ERROR: 'processing_error',
    CONFIGURATION_ERROR: 'configuration_error',
    SUBSCRIPTION_ERROR: 'subscription_error',
    WEBHOOK_ERROR: 'webhook_error',
    WEBHOOK_SIGNATURE_INVALID: 'webhook_signature_invalid',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    INVALID_REQUEST: 'invalid_request',
    API_CONNECTION_ERROR: 'api_connection_error',
    AUTHENTICATION_FAILED: 'authentication_failed'
};
//# sourceMappingURL=billing.js.map