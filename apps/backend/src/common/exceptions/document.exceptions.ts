import { HttpException, HttpStatus } from '@nestjs/common'

/**
 * Exception thrown when a document is not found
 */
export class DocumentNotFoundException extends HttpException {
  constructor(documentId: string) {
    super({
      error: {
        code: 'DOCUMENT_NOT_FOUND',
        message: `Document with ID ${documentId} not found`,
        statusCode: HttpStatus.NOT_FOUND,
        resource: 'Document',
        identifier: documentId
      }
    }, HttpStatus.NOT_FOUND)
  }
}

/**
 * Exception thrown when user doesn't have permission to access a document
 */
export class DocumentAccessDeniedException extends HttpException {
  constructor(documentId: string, operation: string) {
    super({
      error: {
        code: 'DOCUMENT_ACCESS_DENIED',
        message: `You do not have permission to ${operation} this document`,
        statusCode: HttpStatus.FORBIDDEN,
        resource: 'Document',
        identifier: documentId,
        operation
      }
    }, HttpStatus.FORBIDDEN)
  }
}

/**
 * Exception thrown when document file operations fail
 */
export class DocumentFileException extends HttpException {
  constructor(documentId: string, operation: string, reason: string) {
    super({
      error: {
        code: 'DOCUMENT_FILE_ERROR',
        message: `File ${operation} failed for document: ${reason}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Document',
        identifier: documentId,
        operation,
        reason
      }
    }, HttpStatus.BAD_REQUEST)
  }
}

/**
 * Exception thrown when document file size exceeds limits
 */
export class DocumentFileSizeException extends HttpException {
  constructor(fileName: string, actualSize: number, maxSize: number) {
    super({
      error: {
        code: 'DOCUMENT_FILE_SIZE_EXCEEDED',
        message: `File ${fileName} size (${actualSize} bytes) exceeds maximum allowed size (${maxSize} bytes)`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Document',
        fileName,
        actualSize,
        maxSize
      }
    }, HttpStatus.BAD_REQUEST)
  }
}

/**
 * Exception thrown when document file type is not allowed
 */
export class DocumentFileTypeException extends HttpException {
  constructor(fileName: string, mimeType: string, allowedTypes: string[]) {
    super({
      error: {
        code: 'DOCUMENT_FILE_TYPE_NOT_ALLOWED',
        message: `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Document',
        fileName,
        mimeType,
        allowedTypes
      }
    }, HttpStatus.BAD_REQUEST)
  }
}

/**
 * Exception thrown when document URL is invalid or inaccessible
 */
export class DocumentUrlException extends HttpException {
  constructor(url: string, reason: string) {
    super({
      error: {
        code: 'DOCUMENT_URL_ERROR',
        message: `Document URL is invalid or inaccessible: ${reason}`,
        statusCode: HttpStatus.BAD_REQUEST,
        resource: 'Document',
        url,
        reason
      }
    }, HttpStatus.BAD_REQUEST)
  }
}