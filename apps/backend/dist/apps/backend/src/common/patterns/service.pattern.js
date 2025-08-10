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
var EntityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityService = void 0;
const common_1 = require("@nestjs/common");
const error_handler_service_1 = require("../errors/error-handler.service");
let EntityService = EntityService_1 = class EntityService {
    constructor(repository, businessService, errorHandler) {
        this.repository = repository;
        this.businessService = businessService;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(EntityService_1.name);
    }
    async findById(id, userId) {
        try {
            if (!id || typeof id !== 'string') {
                throw this.errorHandler.createValidationError('Invalid entity ID provided', { id: 'Entity ID must be a valid string' });
            }
            const entity = await this.repository.findById(id);
            if (!entity) {
                throw this.errorHandler.createNotFoundError('Entity', id);
            }
            this.businessService.checkPermissions(userId, entity, 'read');
            return this.businessService.applyBusinessRules(entity);
        }
        catch (error) {
            this.logger.error(`Failed to find entity: ${id}`, error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'findById',
                resource: 'entity',
                metadata: { entityId: id, userId }
            });
        }
    }
    async findMany(filters, userId) {
        try {
            const page = filters.page || 1;
            const limit = Math.min(filters.limit || 10, 100);
            const userFilters = { ...filters, userId };
            const [items, total] = await Promise.all([
                this.repository.findMany(userFilters),
                this.repository.count(userFilters)
            ]);
            const processedItems = items.map(item => this.businessService.applyBusinessRules(item));
            return {
                items: processedItems,
                total,
                page,
                pageSize: limit
            };
        }
        catch (error) {
            this.logger.error('Failed to find entities', error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'findMany',
                resource: 'entity',
                metadata: {
                    filtersCount: Object.keys(filters || {}).length,
                    userId: userId
                }
            });
        }
    }
    async create(dto, userId) {
        try {
            this.businessService.validateCreateData(dto);
            const data = {
                ...dto,
                userId,
                status: 'active'
            };
            const entity = await this.repository.create(data);
            this.logger.log(`Entity created: ${entity.id} by user: ${userId}`);
            return this.businessService.applyBusinessRules(entity);
        }
        catch (error) {
            this.logger.error('Failed to create entity', error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'create',
                resource: 'entity',
                metadata: {
                    dtoType: dto.constructor.name,
                    userId: userId
                }
            });
        }
    }
    async update(id, dto, userId) {
        try {
            const existing = await this.findById(id, userId);
            this.businessService.validateUpdateData(dto);
            this.businessService.checkPermissions(userId, existing, 'update');
            const updated = await this.repository.update(id, dto);
            this.logger.log(`Entity updated: ${id} by user: ${userId}`);
            return this.businessService.applyBusinessRules(updated);
        }
        catch (error) {
            this.logger.error(`Failed to update entity: ${id}`, error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'update',
                resource: 'entity',
                metadata: {
                    entityId: id,
                    dtoType: dto.constructor.name,
                    userId: userId
                }
            });
        }
    }
    async delete(id, userId) {
        try {
            const existing = await this.findById(id, userId);
            this.businessService.checkPermissions(userId, existing, 'delete');
            const hasDependencies = await this.checkDependencies(id);
            if (hasDependencies) {
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.CONFLICT, 'Cannot delete entity with active dependencies', { operation: 'delete', resource: 'entity', metadata: { entityId: id } });
            }
            await this.repository.delete(id);
            this.logger.log(`Entity deleted: ${id} by user: ${userId}`);
        }
        catch (error) {
            this.logger.error(`Failed to delete entity: ${id}`, error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'delete',
                resource: 'entity',
                metadata: { entityId: id, userId }
            });
        }
    }
    async getStats(userId) {
        try {
            const [total, active, inactive] = await Promise.all([
                this.repository.count({ userId }),
                this.repository.count({ userId, status: 'active' }),
                this.repository.count({ userId, status: 'inactive' })
            ]);
            return { total, active, inactive };
        }
        catch (error) {
            this.logger.error('Failed to get entity stats', error);
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getStats',
                resource: 'entity',
                metadata: { userId }
            });
        }
    }
    async checkDependencies(_id) {
        return false;
    }
};
exports.EntityService = EntityService;
exports.EntityService = EntityService = EntityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object, Object, error_handler_service_1.ErrorHandlerService])
], EntityService);
