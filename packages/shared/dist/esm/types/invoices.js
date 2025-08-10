/**
 * Invoice management types
 * All types related to customer invoices, invoice items, and invoice generation
 */
export const CUSTOMER_INVOICE_STATUS = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    VIEWED: 'VIEWED',
    PAID: 'PAID',
    OVERDUE: 'OVERDUE',
    CANCELLED: 'CANCELLED'
};
export const CUSTOMER_INVOICE_STATUS_OPTIONS = Object.values(CUSTOMER_INVOICE_STATUS);
// Invoice status display helpers
export const getCustomerInvoiceStatusLabel = (status) => {
    const labels = {
        DRAFT: 'Draft',
        SENT: 'Sent',
        VIEWED: 'Viewed',
        PAID: 'Paid',
        OVERDUE: 'Overdue',
        CANCELLED: 'Cancelled'
    };
    return labels[status] || status;
};
export const getCustomerInvoiceStatusColor = (status) => {
    const colors = {
        DRAFT: 'bg-gray-100 text-gray-800',
        SENT: 'bg-blue-100 text-blue-800',
        VIEWED: 'bg-yellow-100 text-yellow-800',
        PAID: 'bg-green-100 text-green-800',
        OVERDUE: 'bg-red-100 text-red-800',
        CANCELLED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
};
//# sourceMappingURL=invoices.js.map