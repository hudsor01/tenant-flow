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
exports.ServiceAdapter = void 0;
exports.createServiceAdapter = createServiceAdapter;
exports.isBaseCrudService = isBaseCrudService;
exports.adaptBaseCrudService = adaptBaseCrudService;
const common_1 = require("@nestjs/common");
let ServiceAdapter = class ServiceAdapter {
    constructor(baseCrudService) {
        this.baseCrudService = baseCrudService;
    }
    async findByOwner(ownerId, query) {
        return await this.baseCrudService.getByOwner(ownerId, query);
    }
    async findById(ownerId, id) {
        try {
            return await this.baseCrudService.getByIdOrThrow(id, ownerId);
        }
        catch (error) {
            if (error && typeof error === 'object' && 'message' in error) {
                const errorMessage = error.message;
                if (errorMessage.includes('not found') || errorMessage.includes('Not found')) {
                    return null;
                }
            }
            throw error;
        }
    }
    async create(ownerId, createDto) {
        return await this.baseCrudService.create(createDto, ownerId);
    }
    async update(ownerId, id, updateDto) {
        return await this.baseCrudService.update(id, updateDto, ownerId);
    }
    async delete(ownerId, id) {
        await this.baseCrudService.delete(id, ownerId);
        return;
    }
    async getStats(ownerId) {
        if ('getStats' in this.baseCrudService && typeof this.baseCrudService.getStats === 'function') {
            return await this.baseCrudService.getStats(ownerId);
        }
        return {};
    }
};
exports.ServiceAdapter = ServiceAdapter;
exports.ServiceAdapter = ServiceAdapter = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [Object])
], ServiceAdapter);
function createServiceAdapter(service) {
    return new ServiceAdapter(service);
}
function isBaseCrudService(service) {
    return (service !== null &&
        typeof service === 'object' &&
        'getByOwner' in service &&
        'getByIdOrThrow' in service &&
        'create' in service &&
        'update' in service &&
        'delete' in service &&
        typeof service.getByOwner === 'function' &&
        typeof service.getByIdOrThrow === 'function' &&
        typeof service.create === 'function' &&
        typeof service.update === 'function' &&
        typeof service.delete === 'function');
}
function adaptBaseCrudService(service) {
    return createServiceAdapter(service);
}
