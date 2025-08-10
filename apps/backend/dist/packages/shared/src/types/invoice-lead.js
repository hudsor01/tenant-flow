"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEAD_MAGNET_CONFIG = exports.defaultCustomerInvoice = exports.CustomerInvoiceSchema = exports.InvoiceItemSchema = void 0;
exports.validateInvoiceForm = validateInvoiceForm;
exports.validateInvoiceItem = validateInvoiceItem;
exports.checkTierLimits = checkTierLimits;
exports.calculateInvoiceTotals = calculateInvoiceTotals;
const zod_1 = require("zod");
const invoices_1 = require("../constants/invoices");
Object.defineProperty(exports, "LEAD_MAGNET_CONFIG", { enumerable: true, get: function () { return invoices_1.LEAD_MAGNET_CONFIG; } });
exports.InvoiceItemSchema = zod_1.z.object({
    id: zod_1.z.string(),
    description: zod_1.z.string().min(1, 'Description is required'),
    quantity: zod_1.z.number().min(0.01, 'Quantity must be greater than 0'),
    unitPrice: zod_1.z.number().min(0, 'Unit price must be positive'),
    total: zod_1.z.number()
});
exports.CustomerInvoiceSchema = zod_1.z.object({
    invoiceNumber: zod_1.z.string().min(1, 'Invoice number is required'),
    issueDate: zod_1.z.date(),
    dueDate: zod_1.z.date(),
    status: zod_1.z
        .enum(['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED'])
        .default('DRAFT'),
    businessName: zod_1.z.string().min(1, 'Business name is required'),
    businessEmail: zod_1.z.string().email('Valid business email is required'),
    businessAddress: zod_1.z.string().optional(),
    businessCity: zod_1.z.string().optional(),
    businessState: zod_1.z.string().optional(),
    businessZip: zod_1.z.string().optional(),
    businessPhone: zod_1.z.string().optional(),
    businessLogo: zod_1.z.string().optional(),
    clientName: zod_1.z.string().min(1, 'Client name is required'),
    clientEmail: zod_1.z.string().email('Valid client email is required'),
    clientAddress: zod_1.z.string().optional(),
    clientCity: zod_1.z.string().optional(),
    clientState: zod_1.z.string().optional(),
    clientZip: zod_1.z.string().optional(),
    items: zod_1.z.array(exports.InvoiceItemSchema).min(1, 'At least one item is required'),
    notes: zod_1.z.string().optional(),
    terms: zod_1.z.string().optional(),
    subtotal: zod_1.z.number().default(0),
    taxRate: zod_1.z.number().min(0).max(100).default(0),
    taxAmount: zod_1.z.number().default(0),
    total: zod_1.z.number().default(0),
    emailCaptured: zod_1.z.string().email().optional(),
    downloadCount: zod_1.z.number().default(0),
    isProVersion: zod_1.z.boolean().default(false)
});
exports.defaultCustomerInvoice = {
    invoiceNumber: `${invoices_1.INVOICE_NUMBER_PREFIX}${Date.now()}`,
    issueDate: new Date(),
    dueDate: new Date(Date.now() + invoices_1.INVOICE_DEFAULTS.PAYMENT_TERMS_DAYS * 24 * 60 * 60 * 1000),
    status: 'DRAFT',
    taxRate: invoices_1.INVOICE_DEFAULTS.TAX_RATE,
    items: [],
    notes: invoices_1.INVOICE_DEFAULTS.NOTES,
    terms: invoices_1.INVOICE_DEFAULTS.TERMS,
    subtotal: 0,
    taxAmount: 0,
    total: 0,
    downloadCount: invoices_1.INVOICE_DEFAULTS.DOWNLOAD_COUNT,
    isProVersion: invoices_1.INVOICE_DEFAULTS.IS_PRO_VERSION
};
function validateInvoiceForm(data) {
    return exports.CustomerInvoiceSchema.parse(data);
}
function validateInvoiceItem(data) {
    return exports.InvoiceItemSchema.parse(data);
}
function checkTierLimits(invoiceCount, lineItemCount, tier) {
    const config = invoices_1.LEAD_MAGNET_CONFIG[tier];
    const withinInvoiceLimit = config.maxInvoicesPerMonth === -1 || invoiceCount < config.maxInvoicesPerMonth;
    const withinLineItemLimit = config.maxLineItems === -1 || lineItemCount <= config.maxLineItems;
    return {
        withinInvoiceLimit,
        withinLineItemLimit,
        canCreateInvoice: withinInvoiceLimit && withinLineItemLimit
    };
}
function calculateInvoiceTotals(items, taxRate = 0) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return {
        subtotal: Math.round(subtotal * 100) / 100,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100
    };
}
