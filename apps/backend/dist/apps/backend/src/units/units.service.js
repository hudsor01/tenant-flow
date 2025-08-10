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
exports.UnitsService = void 0;
const common_1 = require("@nestjs/common");
const units_repository_1 = require("./units.repository");
const error_handler_service_1 = require("../common/errors/error-handler.service");
const base_crud_service_1 = require("../common/services/base-crud.service");
const base_exception_1 = require("../common/exceptions/base.exception");
const shared_1 = require("@repo/shared");
let UnitsService = class UnitsService extends base_crud_service_1.BaseCrudService {
    constructor(unitsRepository, errorHandler) {
        super(errorHandler);
        this.unitsRepository = unitsRepository;
        this.entityName = 'unit';
        this.repository = unitsRepository;
    }
    async findByIdAndOwner(id, ownerId) {
        return await this.unitsRepository.findByIdAndOwner(id, ownerId, true);
    }
    async calculateStats(ownerId) {
        return await this.unitsRepository.getStatsByOwner(ownerId);
    }
    prepareCreateData(data, _ownerId) {
        const { propertyId, ...restData } = data;
        return {
            ...restData,
            unitNumber: data.unitNumber,
            bedrooms: data.bedrooms || 1,
            bathrooms: data.bathrooms || 1,
            squareFeet: data.squareFeet,
            rent: data.monthlyRent,
            status: data.status || shared_1.UNIT_STATUS.VACANT,
            Property: {
                connect: { id: propertyId }
            }
        };
    }
    prepareUpdateData(data) {
        return {
            ...data,
            status: data.status,
            lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : undefined,
            updatedAt: new Date()
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
    async validateDeletion(entity, ownerId) {
        const hasActiveLeases = await this.unitsRepository.hasActiveLeases(entity.id, ownerId);
        if (hasActiveLeases) {
            throw new base_exception_1.ValidationException('Cannot delete unit with active leases', 'unitId');
        }
    }
    async create(data, ownerId) {
        const hasPropertyAccess = await this.unitsRepository.verifyPropertyOwnership(data.propertyId, ownerId);
        if (!hasPropertyAccess) {
            throw new base_exception_1.ValidationException('You do not have access to this property', 'propertyId');
        }
        return super.create(data, ownerId);
    }
    async getByOwner(ownerId, query) {
        if (!ownerId || typeof ownerId !== 'string' || ownerId.trim().length === 0) {
            throw new base_exception_1.ValidationException('Owner ID is required', 'ownerId');
        }
        try {
            const options = this.parseQueryOptions(query);
            return await this.unitsRepository.findByOwnerWithDetails(ownerId, options);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getByOwner',
                resource: this.entityName,
                metadata: { ownerId }
            });
        }
    }
    async getUnitsByProperty(propertyId, ownerId) {
        try {
            const units = await this.unitsRepository.findByPropertyAndOwner(propertyId, ownerId);
            if (units === null) {
                throw new base_exception_1.ValidationException('You do not have access to this property', 'propertyId');
            }
            return units;
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getUnitsByProperty',
                resource: this.entityName,
                metadata: { propertyId, ownerId }
            });
        }
    }
    async getUnitsByOwner(ownerId) {
        return this.getByOwner(ownerId);
    }
    async getUnitStats(ownerId) {
        return this.getStats(ownerId);
    }
    async getUnitById(id, ownerId) {
        return this.findByIdAndOwner(id, ownerId);
    }
    async getUnitByIdOrThrow(id, ownerId) {
        return this.getByIdOrThrow(id, ownerId);
    }
    async createUnit(ownerId, data) {
        return this.create(data, ownerId);
    }
    async updateUnit(id, ownerId, data) {
        return this.update(id, data, ownerId);
    }
    async deleteUnit(id, ownerId) {
        return this.delete(id, ownerId);
    }
    async delete(id, ownerId) {
        return super.delete(id, ownerId);
    }
    async getStats(ownerId) {
        return super.getStats(ownerId);
    }
};
exports.UnitsService = UnitsService;
exports.UnitsService = UnitsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [units_repository_1.UnitsRepository,
        error_handler_service_1.ErrorHandlerService])
], UnitsService);
