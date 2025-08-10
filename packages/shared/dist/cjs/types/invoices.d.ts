/**
 * Invoice management types
 * All types related to customer invoices, invoice items, and invoice generation
 */
import type { UseFormRegister, FieldErrors } from 'react-hook-form';
import type { CustomerInvoiceForm } from './invoice-lead';
export type CustomerInvoiceStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'PAID' | 'OVERDUE' | 'CANCELLED';
export declare const CUSTOMER_INVOICE_STATUS: {
    readonly DRAFT: "DRAFT";
    readonly SENT: "SENT";
    readonly VIEWED: "VIEWED";
    readonly PAID: "PAID";
    readonly OVERDUE: "OVERDUE";
    readonly CANCELLED: "CANCELLED";
};
export declare const CUSTOMER_INVOICE_STATUS_OPTIONS: ("CANCELLED" | "SENT" | "DRAFT" | "VIEWED" | "PAID" | "OVERDUE")[];
export declare const getCustomerInvoiceStatusLabel: (status: CustomerInvoiceStatus) => string;
export declare const getCustomerInvoiceStatusColor: (status: CustomerInvoiceStatus) => string;
export interface CustomerInvoice {
    id: string;
    invoiceNumber: string;
    status: CustomerInvoiceStatus;
    businessName: string;
    businessEmail: string;
    businessAddress: string | null;
    businessCity: string | null;
    businessState: string | null;
    businessZip: string | null;
    businessPhone: string | null;
    businessLogo: string | null;
    clientName: string;
    clientEmail: string;
    clientAddress: string | null;
    clientCity: string | null;
    clientState: string | null;
    clientZip: string | null;
    issueDate: Date;
    dueDate: Date;
    subtotal: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    notes: string | null;
    terms: string | null;
    emailCaptured: string | null;
    downloadCount: number;
    isProVersion: boolean;
    userAgent: string | null;
    ipAddress: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface CustomerInvoiceItem {
    id: string;
    invoiceId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    createdAt: Date;
}
export interface InvoiceLeadCapture {
    id: string;
    email: string;
    invoiceId: string | null;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    source: string | null;
    medium: string | null;
    campaign: string | null;
    emailSent: boolean;
    emailOpened: boolean;
    linkClicked: boolean;
    converted: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface InvoiceDetailsProps {
    register: UseFormRegister<CustomerInvoiceForm>;
    errors?: FieldErrors<CustomerInvoiceForm>;
}
export interface InvoiceActionsProps {
    invoice: CustomerInvoice;
    onDownload?: () => void;
    onEmail?: () => void;
    onEdit?: () => void;
}
export interface BusinessInfoSectionProps {
    register: UseFormRegister<CustomerInvoiceForm>;
    errors?: FieldErrors<CustomerInvoiceForm>;
}
export interface ClientInfoSectionProps {
    register: UseFormRegister<CustomerInvoiceForm>;
    errors?: FieldErrors<CustomerInvoiceForm>;
}
export interface EmailModalProps {
    isOpen: boolean;
    onClose: () => void;
    invoice: CustomerInvoice;
    onSend?: (email: string, subject: string, message: string) => void;
}
//# sourceMappingURL=invoices.d.ts.map