import { 
  NotFoundException,
  AuthorizationException,
  BusinessException,
  ValidationException
} from './base.exception'

/**
 * Exception thrown when a document is not found
 */
export class DocumentNotFoundException extends NotFoundException {
  constructor(documentId: string) {
    super('Document', documentId)
  }
}

/**
 * Exception thrown when user doesn't have permission to access a document
 */
export class DocumentAccessDeniedException extends AuthorizationException {
  constructor(documentId: string, operation: string) {
    super(`You do not have permission to ${operation} this document`, 'Document', operation, { 
      identifier: documentId 
    })
  }
}

/**
 * Exception thrown when document file operations fail
 */
export class DocumentFileException extends BusinessException {
  constructor(documentId: string, operation: string, reason: string) {
    const message = `File ${operation} failed for document: ${reason}`
    super('DOCUMENT_FILE_ERROR', message, undefined, { 
      resource: 'Document',
      identifier: documentId,
      operation,
      reason 
    })
  }
}

/**
 * Exception thrown when document file size exceeds limits
 */
export class DocumentFileSizeException extends ValidationException {
  constructor(fileName: string, actualSize: number, maxSize: number) {
    const message = `File ${fileName} size (${actualSize} bytes) exceeds maximum allowed size (${maxSize} bytes)`
    super(message, 'fileSize', [actualSize.toString(), maxSize.toString()], { 
      resource: 'Document',
      fileName,
      actualSize,
      maxSize 
    })
  }
}

/**
 * Exception thrown when document file type is not allowed
 */
export class DocumentFileTypeException extends ValidationException {
  constructor(fileName: string, mimeType: string, allowedTypes: string[]) {
    const message = `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`
    super(message, 'mimeType', [mimeType], { 
      resource: 'Document',
      fileName,
      mimeType,
      allowedTypes 
    })
  }
}

/**
 * Exception thrown when document URL is invalid or inaccessible
 */
export class DocumentUrlException extends ValidationException {
  constructor(url: string, reason: string) {
    const message = `Document URL is invalid or inaccessible: ${reason}`
    super(message, 'url', [url], { 
      resource: 'Document',
      url,
      reason 
    })
  }
}