"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INVOICE_FILE_LIMITS = exports.INVOICE_NUMBER_PREFIX = exports.INVOICE_DEFAULTS = exports.CUSTOMER_INVOICE_STATUS_OPTIONS = exports.CUSTOMER_INVOICE_STATUS = exports.LEAD_MAGNET_CONFIG = void 0;
exports.LEAD_MAGNET_CONFIG = {
    FREE_TIER: {
        maxInvoicesPerMonth: 5,
        watermarkRequired: true,
        customBrandingAllowed: false,
        emailRequired: true,
        maxLineItems: 10
    },
    PRO_TIER: {
        maxInvoicesPerMonth: -1,
        watermarkRequired: false,
        customBrandingAllowed: true,
        emailRequired: false,
        maxLineItems: -1,
        price: 9.99
    }
};
exports.CUSTOMER_INVOICE_STATUS = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    VIEWED: 'VIEWED',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED'
};
exports.CUSTOMER_INVOICE_STATUS_OPTIONS = Object.values(exports.CUSTOMER_INVOICE_STATUS);
exports.INVOICE_DEFAULTS = {
    TAX_RATE: 0,
    PAYMENT_TERMS_DAYS: 30,
    NOTES: 'Thank you for your business!',
    TERMS: 'Payment is due within 30 days.',
    DOWNLOAD_COUNT: 0,
    IS_PRO_VERSION: false
};
exports.INVOICE_NUMBER_PREFIX = 'INV-';
exports.INVOICE_FILE_LIMITS = {
    MAX_FILE_SIZE_MB: 10,
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf'
    ]
};
