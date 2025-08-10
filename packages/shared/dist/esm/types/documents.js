/**
 * Document management types
 * All types related to documents, file uploads, and document management
 */
export const DOCUMENT_TYPE = {
    LEASE: 'LEASE',
    INSURANCE: 'INSURANCE',
    INSPECTION: 'INSPECTION',
    RECEIPT: 'RECEIPT',
    PHOTO: 'PHOTO',
    CONTRACT: 'CONTRACT',
    PERMIT: 'PERMIT',
    OTHER: 'OTHER'
};
export const DOCUMENT_TYPE_OPTIONS = Object.values(DOCUMENT_TYPE);
// Document type display helpers
export const getDocumentTypeLabel = (type) => {
    const labels = {
        LEASE: 'Lease Agreement',
        INSURANCE: 'Insurance Document',
        INSPECTION: 'Inspection Report',
        RECEIPT: 'Receipt/Invoice',
        PHOTO: 'Photo',
        CONTRACT: 'Contract',
        PERMIT: 'Permit',
        OTHER: 'Other'
    };
    return labels[type] || type;
};
//# sourceMappingURL=documents.js.map