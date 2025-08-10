/**
 * Invoice-related constants
 * Configuration for lead magnet functionality and invoice management
 */
/**
 * Lead magnet tier configuration
 */
export declare const LEAD_MAGNET_CONFIG: {
    readonly FREE_TIER: {
        readonly maxInvoicesPerMonth: 5;
        readonly watermarkRequired: true;
        readonly customBrandingAllowed: false;
        readonly emailRequired: true;
        readonly maxLineItems: 10;
    };
    readonly PRO_TIER: {
        readonly maxInvoicesPerMonth: -1;
        readonly watermarkRequired: false;
        readonly customBrandingAllowed: true;
        readonly emailRequired: false;
        readonly maxLineItems: -1;
        readonly price: 9.99;
    };
};
export type LeadMagnetTier = keyof typeof LEAD_MAGNET_CONFIG;
/**
 * Customer invoice status enum values
 */
export declare const CUSTOMER_INVOICE_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly SENT: "SENT";
    readonly VIEWED: "VIEWED";
    readonly PAID: "PAID";
    readonly OVERDUE: "OVERDUE";
    readonly CANCELLED: "CANCELLED";
};
export declare const CUSTOMER_INVOICE_STATUS_OPTIONS: ("CANCELLED" | "SENT" | "DRAFT" | "VIEWED" | "PAID" | "OVERDUE")[];
/**
 * Default invoice configuration
 */
export declare const INVOICE_DEFAULTS: {
    readonly TAX_RATE: 0;
    readonly PAYMENT_TERMS_DAYS: 30;
    readonly NOTES: "Thank you for your business!";
    readonly TERMS: "Payment is due within 30 days.";
    readonly DOWNLOAD_COUNT: 0;
    readonly IS_PRO_VERSION: false;
};
/**
 * Invoice number generation pattern
 */
export declare const INVOICE_NUMBER_PREFIX = "INV-";
/**
 * File upload limits for invoice attachments
 */
export declare const INVOICE_FILE_LIMITS: {
    readonly MAX_FILE_SIZE_MB: 10;
    readonly ALLOWED_MIME_TYPES: readonly ["image/jpeg", "image/png", "image/gif", "application/pdf"];
};
//# sourceMappingURL=invoices.d.ts.map