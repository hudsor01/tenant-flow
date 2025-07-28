/**
 * File upload related types shared between frontend and backend
 */

/**
 * Result of a successful file upload
 */
export interface FileUploadResult {
    url: string
    path: string
    filename: string
    size: number
    mimeType: string
    bucket: string
}

/**
 * Options for file upload operations
 */
export interface FileUploadOptions {
    maxSize?: number
    allowedMimeTypes?: string[]
    generateUniqueName?: boolean
    preserveOriginalName?: boolean
    path?: string
}

/**
 * File validation result
 */
export interface FileValidationResult {
    isValid: boolean
    errors?: string[]
    fileInfo?: {
        name: string
        size: number
        mimeType: string
    }
}