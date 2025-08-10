"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STRIPE_ERROR_CONSTANTS = void 0;
exports.STRIPE_ERROR_CONSTANTS = {
    DEFAULT_RETRY_ATTEMPTS: 3,
    DEFAULT_BASE_DELAY_MS: 1000,
    DEFAULT_MAX_DELAY_MS: 10000,
    DEFAULT_EXPONENTIAL_BASE: 2,
    DEFAULT_JITTER_MS: 100,
    RETRYABLE_ERROR_CODES: [
        'RATE_LIMIT_ERROR',
        'API_ERROR',
        'CONNECTION_ERROR',
        'NETWORK_ERROR',
        'TIMEOUT_ERROR'
    ],
    CRITICAL_ERROR_CODES: [
        'AUTHENTICATION_ERROR',
        'PERMISSION_ERROR'
    ],
    CLIENT_ERROR_CODES: [
        'CARD_ERROR',
        'INVALID_REQUEST',
        'IDEMPOTENCY_ERROR'
    ]
};
