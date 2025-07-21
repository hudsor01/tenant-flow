/**
 * Document management types
 * All types related to documents, file uploads, and document management
 */

// Document type enum
export type DocumentType = 
  | 'LEASE'
  | 'INSURANCE'
  | 'INSPECTION'
  | 'RECEIPT'
  | 'PHOTO'
  | 'CONTRACT'
  | 'PERMIT'
  | 'OTHER'

export const DOCUMENT_TYPE = {
  LEASE: 'LEASE',
  INSURANCE: 'INSURANCE',
  INSPECTION: 'INSPECTION',
  RECEIPT: 'RECEIPT',
  PHOTO: 'PHOTO',
  CONTRACT: 'CONTRACT',
  PERMIT: 'PERMIT',
  OTHER: 'OTHER'
} as const

export const DOCUMENT_TYPE_OPTIONS = Object.values(DOCUMENT_TYPE)

// Document type display helpers
export const getDocumentTypeLabel = (type: DocumentType): string => {
  const labels: Record<DocumentType, string> = {
    LEASE: 'Lease Agreement',
    INSURANCE: 'Insurance Document',
    INSPECTION: 'Inspection Report',
    RECEIPT: 'Receipt/Invoice',
    PHOTO: 'Photo',
    CONTRACT: 'Contract',
    PERMIT: 'Permit',
    OTHER: 'Other'
  }
  return labels[type] || type
}

// Document entity types
export interface Document {
  id: string
  name: string
  url: string
  type: DocumentType
  propertyId: string | null
  leaseId: string | null
  fileSizeBytes: bigint
  createdAt: Date | null
  updatedAt: Date | null
}