"use strict";
/**
 * Invoice-related constants
 * Configuration for lead magnet functionality and invoice management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVOICE_FILE_LIMITS = exports.INVOICE_NUMBER_PREFIX = exports.INVOICE_DEFAULTS = exports.CUSTOMER_INVOICE_STATUS_OPTIONS = exports.CUSTOMER_INVOICE_STATUS = exports.LEAD_MAGNET_CONFIG = void 0;
// ========================
// Lead Magnet Configuration
// ========================
/**
 * Lead magnet tier configuration
 */
exports.LEAD_MAGNET_CONFIG = {
    FREE_TIER: {
        maxInvoicesPerMonth: 5,
        watermarkRequired: true,
        customBrandingAllowed: false,
        emailRequired: true,
        maxLineItems: 10
    },
    PRO_TIER: {
        maxInvoicesPerMonth: -1, // unlimited
        watermarkRequired: false,
        customBrandingAllowed: true,
        emailRequired: false,
        maxLineItems: -1, // unlimited
        price: 9.99
    }
};
// ========================
// Invoice Status Constants
// ========================
/**
 * Customer invoice status enum values
 */
exports.CUSTOMER_INVOICE_STATUS = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    VIEWED: 'VIEWED',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED'
};
exports.CUSTOMER_INVOICE_STATUS_OPTIONS = Object.values(exports.CUSTOMER_INVOICE_STATUS);
// ========================
// Default Values
// ========================
/**
 * Default invoice configuration
 */
exports.INVOICE_DEFAULTS = {
    TAX_RATE: 0,
    PAYMENT_TERMS_DAYS: 30,
    NOTES: 'Thank you for your business!',
    TERMS: 'Payment is due within 30 days.',
    DOWNLOAD_COUNT: 0,
    IS_PRO_VERSION: false
};
/**
 * Invoice number generation pattern
 */
exports.INVOICE_NUMBER_PREFIX = 'INV-';
/**
 * File upload limits for invoice attachments
 */
exports.INVOICE_FILE_LIMITS = {
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf'
    ]
};
//# sourceMappingURL=invoices.js.map