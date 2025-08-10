"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentsService = void 0;
const common_1 = require("@nestjs/common");
const document_repository_1 = require("./document.repository");
const error_handler_service_1 = require("../common/errors/error-handler.service");
const base_crud_service_1 = require("../common/services/base-crud.service");
const audit_service_1 = require("../common/security/audit.service");
const document_exceptions_1 = require("../common/exceptions/document.exceptions");
let DocumentsService = class DocumentsService extends base_crud_service_1.BaseCrudService {
    constructor(documentRepository, errorHandler, auditService) {
        super(errorHandler, auditService);
        this.documentRepository = documentRepository;
        this.entityName = 'document';
        this.MAX_FILE_SIZE = 104857600;
        this.ALLOWED_MIME_TYPES = [
            'application/pdf',
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv'
        ];
        this.repository = documentRepository;
    }
    async findByIdAndOwner(id, ownerId) {
        return await this.documentRepository.findByIdAndOwner(id, ownerId);
    }
    async calculateStats(ownerId) {
        return await this.documentRepository.getStatsByOwner(ownerId);
    }
    async validateCreate(data) {
        this.validateFileConstraints(data);
    }
    async validateUpdate(data) {
        this.validateFileConstraints(data);
    }
    prepareCreateData(data, _ownerId) {
        return {
            ...data,
            size: data.fileSizeBytes ? BigInt(data.fileSizeBytes) : undefined
        };
    }
    prepareUpdateData(data) {
        return {
            ...data,
            size: data.fileSizeBytes ? BigInt(data.fileSizeBytes) : undefined
        };
    }
    createOwnerWhereClause(id, ownerId) {
        return {
            id,
            Property: {
                ownerId
            }
        };
    }
    async verifyOwnership(id, ownerId) {
        const exists = await this.documentRepository.findByIdAndOwner(id, ownerId);
        if (!exists) {
            throw new document_exceptions_1.DocumentNotFoundException(id);
        }
    }
    async create(data, ownerId) {
        if (data.propertyId) {
            await this.verifyPropertyOwnership(data.propertyId, ownerId);
        }
        if (data.leaseId) {
            await this.verifyLeaseOwnership(data.leaseId, ownerId);
        }
        return super.create(data, ownerId);
    }
    async update(id, data, ownerId) {
        const existingDocument = await this.findByIdAndOwner(id, ownerId);
        if (!existingDocument) {
            throw new document_exceptions_1.DocumentNotFoundException(id);
        }
        if (data.propertyId && data.propertyId !== existingDocument.propertyId) {
            await this.verifyPropertyOwnership(data.propertyId, ownerId);
        }
        if (data.leaseId && data.leaseId !== existingDocument.leaseId) {
            await this.verifyLeaseOwnership(data.leaseId, ownerId);
        }
        return super.update(id, data, ownerId);
    }
    async getByProperty(propertyId, ownerId, query) {
        try {
            await this.verifyPropertyOwnership(propertyId, ownerId);
            return await this.documentRepository.findByProperty(propertyId, ownerId, query);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getByProperty',
                resource: 'document',
                metadata: { propertyId, ownerId }
            });
        }
    }
    async getByLease(leaseId, ownerId, query) {
        try {
            await this.verifyLeaseOwnership(leaseId, ownerId);
            return await this.documentRepository.findByLease(leaseId, ownerId, query);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getByLease',
                resource: 'document',
                metadata: { leaseId, ownerId }
            });
        }
    }
    async getByType(type, ownerId, query) {
        try {
            return await this.documentRepository.findByType(type, ownerId, query);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getByType',
                resource: 'document',
                metadata: { type, ownerId }
            });
        }
    }
    validateFileConstraints(dto) {
        if (dto.fileSizeBytes && dto.fileSizeBytes > this.MAX_FILE_SIZE) {
            throw new document_exceptions_1.DocumentFileSizeException(dto.filename || dto.name || 'Unknown', dto.fileSizeBytes, this.MAX_FILE_SIZE);
        }
        if (dto.mimeType && !this.ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
            throw new document_exceptions_1.DocumentFileTypeException(dto.filename || dto.name || 'Unknown', dto.mimeType, this.ALLOWED_MIME_TYPES);
        }
        if (dto.url && !this.isValidUrl(dto.url)) {
            throw new document_exceptions_1.DocumentUrlException(dto.url, 'Invalid URL format');
        }
    }
    isValidUrl(url) {
        try {
            const parsedUrl = new URL(url);
            return ['http:', 'https:'].includes(parsedUrl.protocol);
        }
        catch {
            return false;
        }
    }
    async verifyPropertyOwnership(propertyId, ownerId) {
        const property = await this.documentRepository.prismaClient.property.findFirst({
            where: { id: propertyId, ownerId }
        });
        if (!property) {
            throw new document_exceptions_1.DocumentFileException(propertyId, 'property verification', 'Property not found or access denied');
        }
    }
    async verifyLeaseOwnership(leaseId, ownerId) {
        const lease = await this.documentRepository.prismaClient.lease.findFirst({
            where: {
                id: leaseId,
                Unit: {
                    Property: {
                        ownerId
                    }
                }
            }
        });
        if (!lease) {
            throw new document_exceptions_1.DocumentFileException(leaseId, 'lease verification', 'Lease not found or access denied');
        }
    }
};
exports.DocumentsService = DocumentsService;
exports.DocumentsService = DocumentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [document_repository_1.DocumentRepository,
        error_handler_service_1.ErrorHandlerService,
        audit_service_1.SecurityAuditService])
], DocumentsService);
