/**
 * File and Document types
 * Types for file uploads and document management
 */

// Document type enum - matches Prisma schema DocumentType enum
export type DocumentType = 'LEASE' | 'INVOICE' | 'RECEIPT' | 'PROPERTY_PHOTO' | 'INSPECTION' | 'MAINTENANCE' | 'OTHER'

// Document interface - matches Prisma schema
export interface Document {
  id: string
  name: string
  filename: string | null
  url: string
  type: DocumentType
  mimeType: string | null
  size: bigint | null
  propertyId: string | null
  leaseId: string | null
  fileSizeBytes: bigint
  createdAt: string | null
  updatedAt: string | null
}

// File interface - matches Prisma schema  
export interface File {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number | null
  url: string
  uploadedById: string | null
  propertyId: string | null
  maintenanceRequestId: string | null
  createdAt: string
}

// File upload related types
export interface FileUploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FileUploadOptions {
  maxSize?: number
  allowedTypes?: string[]
  onProgress?: (progress: FileUploadProgress) => void
}

export interface FileUploadResult {
  file: File
  url: string
  success: boolean
  error?: string
}