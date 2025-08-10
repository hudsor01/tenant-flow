/**
 * Invoice lead magnet and validation types
 * Zod schemas and lead capture functionality for the invoice generator
 */
import { z } from 'zod';
import type { CustomerInvoice, CustomerInvoiceItem } from './invoices';
import { LEAD_MAGNET_CONFIG, type LeadMagnetTier } from '../constants/invoices';
/**
 * Invoice item validation schema
 */
export declare const InvoiceItemSchema: z.ZodObject<{
    id: z.ZodString;
    description: z.ZodString;
    quantity: z.ZodNumber;
    unitPrice: z.ZodNumber;
    total: z.ZodNumber;
}, z.core.$strip>;
/**
 * Customer invoice validation schema for lead magnet
 */
export declare const CustomerInvoiceSchema: z.ZodObject<{
    invoiceNumber: z.ZodString;
    issueDate: z.ZodDate;
    dueDate: z.ZodDate;
    status: z.ZodDefault<z.ZodEnum<{
        CANCELLED: "CANCELLED";
        SENT: "SENT";
        DRAFT: "DRAFT";
        VIEWED: "VIEWED";
        PAID: "PAID";
        OVERDUE: "OVERDUE";
    }>>;
    businessName: z.ZodString;
    businessEmail: z.ZodString;
    businessAddress: z.ZodOptional<z.ZodString>;
    businessCity: z.ZodOptional<z.ZodString>;
    businessState: z.ZodOptional<z.ZodString>;
    businessZip: z.ZodOptional<z.ZodString>;
    businessPhone: z.ZodOptional<z.ZodString>;
    businessLogo: z.ZodOptional<z.ZodString>;
    clientName: z.ZodString;
    clientEmail: z.ZodString;
    clientAddress: z.ZodOptional<z.ZodString>;
    clientCity: z.ZodOptional<z.ZodString>;
    clientState: z.ZodOptional<z.ZodString>;
    clientZip: z.ZodOptional<z.ZodString>;
    items: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        quantity: z.ZodNumber;
        unitPrice: z.ZodNumber;
        total: z.ZodNumber;
    }, z.core.$strip>>;
    notes: z.ZodOptional<z.ZodString>;
    terms: z.ZodOptional<z.ZodString>;
    subtotal: z.ZodDefault<z.ZodNumber>;
    taxRate: z.ZodDefault<z.ZodNumber>;
    taxAmount: z.ZodDefault<z.ZodNumber>;
    total: z.ZodDefault<z.ZodNumber>;
    emailCaptured: z.ZodOptional<z.ZodString>;
    downloadCount: z.ZodDefault<z.ZodNumber>;
    isProVersion: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
/**
 * Type exports - use Zod inference for runtime validation
 * but ensure they match the centralized types
 */
export type CustomerInvoiceForm = z.infer<typeof CustomerInvoiceSchema>;
export type InvoiceItemForm = z.infer<typeof InvoiceItemSchema>;
/**
 * Type assertions to ensure Zod schemas match centralized types
 * (These are compile-time checks only)
 */
export type CustomerInvoiceCheck = CustomerInvoiceForm extends Omit<CustomerInvoice, 'id' | 'createdAt' | 'updatedAt' | 'userAgent' | 'ipAddress'> ? true : false;
export type InvoiceItemCheck = InvoiceItemForm extends Omit<CustomerInvoiceItem, 'invoiceId' | 'createdAt'> ? true : false;
/**
 * Email capture data for lead magnets
 */
export interface EmailCaptureData {
    email: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    source?: string;
    invoiceId: string;
}
/**
 * Invoice download response
 */
export interface InvoiceDownloadResponse {
    success: boolean;
    downloadUrl?: string;
    message?: string;
}
/**
 * Invoice generation request
 */
export interface InvoiceGenerationRequest {
    invoice: Omit<CustomerInvoice, 'id' | 'createdAt' | 'updatedAt'>;
    emailCapture?: EmailCaptureData;
}
/**
 * Default invoice template
 */
export declare const defaultCustomerInvoice: Partial<CustomerInvoiceForm>;
export { LEAD_MAGNET_CONFIG };
export type { LeadMagnetTier };
/**
 * Validate invoice form data
 */
export declare function validateInvoiceForm(data: unknown): CustomerInvoiceForm;
/**
 * Validate invoice item
 */
export declare function validateInvoiceItem(data: unknown): InvoiceItemForm;
/**
 * Check if invoice is within tier limits
 */
export declare function checkTierLimits(invoiceCount: number, lineItemCount: number, tier: LeadMagnetTier): {
    withinInvoiceLimit: boolean;
    withinLineItemLimit: boolean;
    canCreateInvoice: boolean;
};
/**
 * Calculate invoice totals
 */
export declare function calculateInvoiceTotals(items: InvoiceItemForm[], taxRate?: number): {
    subtotal: number;
    taxAmount: number;
    total: number;
};
//# sourceMappingURL=invoice-lead.d.ts.map