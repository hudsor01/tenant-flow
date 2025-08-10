"use strict";
/**
 * Document management types
 * All types related to documents, file uploads, and document management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDocumentTypeLabel = exports.DOCUMENT_TYPE_OPTIONS = exports.DOCUMENT_TYPE = void 0;
exports.DOCUMENT_TYPE = {
    LEASE: 'LEASE',
    INSURANCE: 'INSURANCE',
    INSPECTION: 'INSPECTION',
    RECEIPT: 'RECEIPT',
    PHOTO: 'PHOTO',
    CONTRACT: 'CONTRACT',
    PERMIT: 'PERMIT',
    OTHER: 'OTHER'
};
exports.DOCUMENT_TYPE_OPTIONS = Object.values(exports.DOCUMENT_TYPE);
// Document type display helpers
const getDocumentTypeLabel = (type) => {
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
exports.getDocumentTypeLabel = getDocumentTypeLabel;
//# sourceMappingURL=documents.js.map