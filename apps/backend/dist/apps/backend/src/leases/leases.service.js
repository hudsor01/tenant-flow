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
exports.LeasesService = void 0;
const common_1 = require("@nestjs/common");
const lease_repository_1 = require("./lease.repository");
const error_handler_service_1 = require("../common/errors/error-handler.service");
const base_crud_service_1 = require("../common/services/base-crud.service");
const lease_exceptions_1 = require("../common/exceptions/lease.exceptions");
let LeasesService = class LeasesService extends base_crud_service_1.BaseCrudService {
    constructor(leaseRepository, errorHandler) {
        super(errorHandler);
        this.leaseRepository = leaseRepository;
        this.entityName = 'lease';
        this.repository = leaseRepository;
    }
    async findByIdAndOwner(id, ownerId) {
        return await this.leaseRepository.findByIdAndOwner(id, ownerId);
    }
    async calculateStats(ownerId) {
        return await this.leaseRepository.getStatsByOwner(ownerId);
    }
    prepareCreateData(data, _ownerId) {
        const { unitId, tenantId, ...restData } = data;
        return {
            ...restData,
            startDate: new Date(data.startDate),
            endDate: new Date(data.endDate),
            Tenant: {
                connect: { id: tenantId }
            },
            Unit: {
                connect: { id: unitId }
            }
        };
    }
    prepareUpdateData(data) {
        const updateData = {
            ...data,
            updatedAt: new Date()
        };
        if (data.startDate) {
            updateData.startDate = new Date(data.startDate);
        }
        if (data.endDate) {
            updateData.endDate = new Date(data.endDate);
        }
        return updateData;
    }
    createOwnerWhereClause(id, ownerId) {
        return {
            id,
            Unit: {
                Property: {
                    ownerId
                }
            }
        };
    }
    validateLeaseDates(startDate, endDate, leaseId) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
            throw new lease_exceptions_1.InvalidLeaseDatesException(leaseId || 'new', startDate, endDate);
        }
    }
    async create(data, ownerId) {
        this.validateLeaseDates(data.startDate, data.endDate);
        const hasConflict = await this.leaseRepository.checkLeaseConflict(data.unitId, new Date(data.startDate), new Date(data.endDate));
        if (hasConflict) {
            throw new lease_exceptions_1.LeaseConflictException(data.unitId, data.startDate, data.endDate);
        }
        return await super.create(data, ownerId);
    }
    async update(id, data, ownerId) {
        const existingLease = await this.getByIdOrThrow(id, ownerId);
        if (data.startDate || data.endDate) {
            const startDate = data.startDate || existingLease.startDate.toISOString();
            const endDate = data.endDate || existingLease.endDate.toISOString();
            this.validateLeaseDates(startDate, endDate, id);
            if (data.startDate || data.endDate) {
                const hasConflict = await this.leaseRepository.checkLeaseConflict(existingLease.unitId, new Date(startDate), new Date(endDate), id);
                if (hasConflict) {
                    throw new lease_exceptions_1.LeaseConflictException(existingLease.unitId, startDate, endDate);
                }
            }
        }
        return await super.update(id, data, ownerId);
    }
    async getByUnit(unitId, ownerId, query) {
        if (!unitId || !ownerId) {
            throw new Error('Unit ID and Owner ID are required');
        }
        try {
            return await this.leaseRepository.findByUnit(unitId, ownerId, query);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getByUnit',
                resource: this.entityName,
                metadata: { unitId, ownerId }
            });
        }
    }
    async getByTenant(tenantId, ownerId, query) {
        if (!tenantId || !ownerId) {
            throw new Error('Tenant ID and Owner ID are required');
        }
        try {
            return await this.leaseRepository.findByTenant(tenantId, ownerId, query);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'getByTenant',
                resource: this.entityName,
                metadata: { tenantId, ownerId }
            });
        }
    }
};
exports.LeasesService = LeasesService;
exports.LeasesService = LeasesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [lease_repository_1.LeaseRepository,
        error_handler_service_1.ErrorHandlerService])
], LeasesService);
