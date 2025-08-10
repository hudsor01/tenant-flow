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
exports.BaseCrudService = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const shared_1 = require("@repo/shared");
const error_handler_service_1 = require("../errors/error-handler.service");
const base_exception_1 = require("../exceptions/base.exception");
const audit_service_1 = require("../security/audit.service");
let BaseCrudService = class BaseCrudService {
    constructor(errorHandler, auditService) {
        this.errorHandler = errorHandler;
        this.auditService = auditService;
        this.logger = new common_1.Logger(this.constructor.name);
        this.validateAbstractImplementations();
    }
    validateAbstractImplementations() {
        const requiredMethods = [
            'findByIdAndOwner',
            'calculateStats',
            'prepareCreateData',
            'prepareUpdateData',
            'createOwnerWhereClause'
        ];
        for (const method of requiredMethods) {
            if (typeof this[method] !== 'function') {
                throw new Error(`Security violation: ${this.constructor.name} must implement ${method}() for multi-tenant data isolation`);
            }
        }
    }
    validateServiceInitialization() {
        if (!this.entityName) {
            throw new Error(`Security violation: ${this.constructor.name} must define entityName`);
        }
        if (!this.repository) {
            throw new Error(`Security violation: ${this.constructor.name} must define repository`);
        }
    }
    async getByOwner(ownerId, query) {
        this.validateServiceInitialization();
        this.validateOwnerId(ownerId);
        try {
            const options = this.parseQueryOptions(query);
            return await this.repository.findManyByOwner(ownerId, options);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getByOwner',
                resource: this.entityName,
                metadata: { ownerId }
            });
        }
    }
    async getByIdOrThrow(id, ownerId) {
        this.validateServiceInitialization();
        this.validateId(id);
        this.validateOwnerId(ownerId);
        try {
            const entity = await this.findByIdAndOwner(id, ownerId);
            if (!entity) {
                throw new base_exception_1.NotFoundException(this.entityName, id);
            }
            return entity;
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getByIdOrThrow',
                resource: this.entityName,
                metadata: { id, ownerId }
            });
        }
    }
    async getStats(ownerId) {
        this.validateServiceInitialization();
        this.validateOwnerId(ownerId);
        try {
            return await this.calculateStats(ownerId);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getStats',
                resource: this.entityName,
                metadata: { ownerId }
            });
        }
    }
    async create(data, ownerId) {
        this.validateServiceInitialization();
        this.validateOwnerId(ownerId);
        this.validateCreateData(data);
        try {
            const createData = this.prepareCreateData(data, ownerId);
            const result = await this.repository.create({ data: createData });
            this.logger.log(`${this.entityName} created`, {
                id: result.id,
                ownerId
            });
            if (this.auditService) {
                await this.auditService.logSecurityEvent({
                    eventType: shared_1.SecurityEventType.ADMIN_ACTION,
                    userId: ownerId,
                    resource: this.entityName.toLowerCase(),
                    action: 'create',
                    details: JSON.stringify({
                        entityId: result.id,
                        entityType: this.entityName
                    })
                });
            }
            return result;
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'create',
                resource: this.entityName,
                metadata: { ownerId }
            });
        }
    }
    async update(id, data, ownerId) {
        this.validateServiceInitialization();
        this.validateId(id);
        this.validateOwnerId(ownerId);
        this.validateUpdateData(data);
        try {
            await this.getByIdOrThrow(id, ownerId);
            const updateData = this.prepareUpdateData(data);
            const where = this.createOwnerWhereClause(id, ownerId);
            const result = await this.repository.update({
                where,
                data: updateData
            });
            this.logger.log(`${this.entityName} updated`, { id, ownerId });
            if (this.auditService) {
                await this.auditService.logSecurityEvent({
                    eventType: shared_1.SecurityEventType.ADMIN_ACTION,
                    userId: ownerId,
                    resource: this.entityName.toLowerCase(),
                    action: 'update',
                    details: JSON.stringify({
                        entityId: id,
                        entityType: this.entityName
                    })
                });
            }
            return result;
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'update',
                resource: this.entityName,
                metadata: { id, ownerId }
            });
        }
    }
    async delete(id, ownerId) {
        this.validateServiceInitialization();
        this.validateId(id);
        this.validateOwnerId(ownerId);
        try {
            const entity = await this.getByIdOrThrow(id, ownerId);
            await this.validateDeletion(entity, ownerId);
            const where = this.createOwnerWhereClause(id, ownerId);
            const result = await this.repository.delete({ where });
            this.logger.log(`${this.entityName} deleted`, { id, ownerId });
            if (this.auditService) {
                await this.auditService.logSecurityEvent({
                    eventType: shared_1.SecurityEventType.ADMIN_ACTION,
                    userId: ownerId,
                    resource: this.entityName.toLowerCase(),
                    action: 'delete',
                    details: JSON.stringify({
                        entityId: id,
                        entityType: this.entityName
                    })
                });
            }
            return result;
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'delete',
                resource: this.entityName,
                metadata: { id, ownerId }
            });
        }
    }
    async findByRelatedEntity(field, value, ownerId, options) {
        const where = {
            [field]: value,
            OR: [
                { ownerId },
                { Unit: { Property: { ownerId } } },
                { Property: { ownerId } }
            ]
        };
        return await this.repository.findMany({ where, ...options });
    }
    async validateDeletion(_entity, _ownerId) {
        return Promise.resolve();
    }
    validateCreateData(_data) {
    }
    validateUpdateData(_data) {
    }
    parseQueryOptions(query) {
        if (!query)
            return {};
        const options = { ...query };
        if (query.limit !== undefined) {
            const limit = Number(query.limit);
            if (isNaN(limit) || limit < 0 || limit > 1000) {
                throw new base_exception_1.ValidationException('Limit must be between 0 and 1000', 'limit');
            }
            options.limit = limit;
        }
        if (query.offset !== undefined) {
            const offset = Number(query.offset);
            if (isNaN(offset) || offset < 0) {
                throw new base_exception_1.ValidationException('Offset must be non-negative', 'offset');
            }
            options.offset = offset;
        }
        if (query.page !== undefined) {
            const page = Number(query.page);
            if (isNaN(page) || page < 1) {
                throw new base_exception_1.ValidationException('Page must be a positive number', 'page');
            }
            const limit = options.limit ? Number(options.limit) : 20;
            options.offset = (page - 1) * limit;
            options.page = page;
        }
        if (query.sortBy) {
            options.sortBy = query.sortBy;
            options.sortOrder = query.sortOrder || 'desc';
        }
        return options;
    }
    async findByUnit(unitId, ownerId, query) {
        this.validateId(unitId);
        this.validateOwnerId(ownerId);
        try {
            const options = this.parseQueryOptions(query);
            return await this.findByRelatedEntity('unitId', unitId, ownerId, options);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'findByUnit',
                resource: this.entityName,
                metadata: { unitId, ownerId }
            });
        }
    }
    async findByTenant(tenantId, ownerId, query) {
        this.validateId(tenantId);
        this.validateOwnerId(ownerId);
        try {
            const options = this.parseQueryOptions(query);
            return await this.findByRelatedEntity('tenantId', tenantId, ownerId, options);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'findByTenant',
                resource: this.entityName,
                metadata: { tenantId, ownerId }
            });
        }
    }
    async findByProperty(propertyId, ownerId, query) {
        this.validateId(propertyId);
        this.validateOwnerId(ownerId);
        try {
            const options = this.parseQueryOptions(query);
            return await this.findByRelatedEntity('propertyId', propertyId, ownerId, options);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'findByProperty',
                resource: this.entityName,
                metadata: { propertyId, ownerId }
            });
        }
    }
    async findAllByOwner(ownerId, query) {
        return this.getByOwner(ownerId, query);
    }
    async findById(id, ownerId) {
        return this.getByIdOrThrow(id, ownerId);
    }
    async findOne(id, ownerId) {
        return this.getByIdOrThrow(id, ownerId);
    }
    async remove(id, ownerId) {
        return this.delete(id, ownerId);
    }
    validateId(id) {
        if (!id || typeof id !== 'string' || id.trim().length === 0) {
            throw new base_exception_1.ValidationException(`${this.entityName} ID is required`, 'id');
        }
    }
    validateOwnerId(ownerId) {
        if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
            throw new base_exception_1.ValidationException('Owner ID is required', 'ownerId');
        }
    }
};
exports.BaseCrudService = BaseCrudService;
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 100, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], BaseCrudService.prototype, "getByOwner", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 100, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BaseCrudService.prototype, "getByIdOrThrow", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 100, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], BaseCrudService.prototype, "getStats", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], BaseCrudService.prototype, "create", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], BaseCrudService.prototype, "update", null);
__decorate([
    (0, throttler_1.Throttle)({ default: { limit: 10, ttl: 60000 } }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], BaseCrudService.prototype, "delete", null);
exports.BaseCrudService = BaseCrudService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [error_handler_service_1.ErrorHandlerService,
        audit_service_1.SecurityAuditService])
], BaseCrudService);
