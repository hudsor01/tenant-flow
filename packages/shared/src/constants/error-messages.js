"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHARED_ERROR_MESSAGES = void 0;
exports.SHARED_ERROR_MESSAGES = {
    DEFAULT_PLAN_NOT_FOUND: 'Default plan not found',
    STRIPE_PRICE_ID_MISSING: (plan, period) => `No Stripe price ID configured for plan: ${plan}, period: ${period}`,
    STRIPE_ENV_VAR_REQUIRED: (varName) => `${varName} is required`
};
//# sourceMappingURL=error-messages.js.map