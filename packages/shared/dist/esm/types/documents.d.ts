/**
 * Document management types
 * All types related to documents, file uploads, and document management
 */
export type DocumentType = 'LEASE' | 'INSURANCE' | 'INSPECTION' | 'RECEIPT' | 'PHOTO' | 'CONTRACT' | 'PERMIT' | 'OTHER';
export declare const DOCUMENT_TYPE: {
    readonly LEASE: "LEASE";
    readonly INSURANCE: "INSURANCE";
    readonly INSPECTION: "INSPECTION";
    readonly RECEIPT: "RECEIPT";
    readonly PHOTO: "PHOTO";
    readonly CONTRACT: "CONTRACT";
    readonly PERMIT: "PERMIT";
    readonly OTHER: "OTHER";
};
export declare const DOCUMENT_TYPE_OPTIONS: ("OTHER" | "LEASE" | "RECEIPT" | "INSPECTION" | "INSURANCE" | "PHOTO" | "CONTRACT" | "PERMIT")[];
export declare const getDocumentTypeLabel: (type: DocumentType) => string;
export interface Document {
    id: string;
    name: string;
    url: string;
    type: DocumentType;
    propertyId: string | null;
    leaseId: string | null;
    fileSizeBytes: bigint;
    createdAt: Date | null;
    updatedAt: Date | null;
}
//# sourceMappingURL=documents.d.ts.map