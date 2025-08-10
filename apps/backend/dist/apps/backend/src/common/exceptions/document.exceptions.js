"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentUrlException = exports.DocumentFileTypeException = exports.DocumentFileSizeException = exports.DocumentFileException = exports.DocumentAccessDeniedException = exports.DocumentNotFoundException = void 0;
const base_exception_1 = require("./base.exception");
class DocumentNotFoundException extends base_exception_1.NotFoundException {
    constructor(documentId) {
        super('Document', documentId);
    }
}
exports.DocumentNotFoundException = DocumentNotFoundException;
class DocumentAccessDeniedException extends base_exception_1.AuthorizationException {
    constructor(documentId, operation) {
        super(`You do not have permission to ${operation} this document`, 'Document', operation, {
            identifier: documentId
        });
    }
}
exports.DocumentAccessDeniedException = DocumentAccessDeniedException;
class DocumentFileException extends base_exception_1.BusinessException {
    constructor(documentId, operation, reason) {
        const message = `File ${operation} failed for document: ${reason}`;
        super('DOCUMENT_FILE_ERROR', message, undefined, {
            resource: 'Document',
            identifier: documentId,
            operation,
            reason
        });
    }
}
exports.DocumentFileException = DocumentFileException;
class DocumentFileSizeException extends base_exception_1.ValidationException {
    constructor(fileName, actualSize, maxSize) {
        const message = `File ${fileName} size (${actualSize} bytes) exceeds maximum allowed size (${maxSize} bytes)`;
        super(message, 'fileSize', [actualSize.toString(), maxSize.toString()], {
            resource: 'Document',
            fileName,
            actualSize,
            maxSize
        });
    }
}
exports.DocumentFileSizeException = DocumentFileSizeException;
class DocumentFileTypeException extends base_exception_1.ValidationException {
    constructor(fileName, mimeType, allowedTypes) {
        const message = `File type ${mimeType} is not allowed. Allowed types: ${allowedTypes.join(', ')}`;
        super(message, 'mimeType', [mimeType], {
            resource: 'Document',
            fileName,
            mimeType,
            allowedTypes
        });
    }
}
exports.DocumentFileTypeException = DocumentFileTypeException;
class DocumentUrlException extends base_exception_1.ValidationException {
    constructor(url, reason) {
        const message = `Document URL is invalid or inaccessible: ${reason}`;
        super(message, 'url', [url], {
            resource: 'Document',
            url,
            reason
        });
    }
}
exports.DocumentUrlException = DocumentUrlException;
