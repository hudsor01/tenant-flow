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

export const Document_Type = {
	LEASE: 'LEASE',
	INSURANCE: 'INSURANCE',
	INSPECTION: 'INSPECTION',
	RECEIPT: 'RECEIPT',
	PHOTO: 'PHOTO',
	CONTRACT: 'CONTRACT',
	PERMIT: 'PERMIT',
	OTHER: 'OTHER'
} as const