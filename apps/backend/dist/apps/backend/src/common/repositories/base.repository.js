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
exports.BaseRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const error_handler_service_1 = require("../errors/error-handler.service");
let BaseRepository = class BaseRepository {
    constructor(prisma) {
        this.prisma = prisma;
        this.errorHandler = new error_handler_service_1.ErrorHandlerService();
        this.logger = new common_1.Logger(`${this.constructor.name}`);
    }
    get model() {
        const prismaModel = this.prisma[this.modelName];
        if (!prismaModel) {
            throw new Error(`Model ${this.modelName} not found in Prisma client`);
        }
        return prismaModel;
    }
    async findMany(options = {}) {
        const { limit, offset, ...findOptions } = options;
        const queryOptions = {
            ...findOptions
        };
        if (limit !== undefined) {
            queryOptions.take = limit;
        }
        if (offset !== undefined) {
            queryOptions.skip = offset;
        }
        return await this.model.findMany(queryOptions);
    }
    async findManyPaginated(options = {}) {
        const { page = 1, limit = 10, offset, ...findOptions } = options;
        const actualOffset = offset ?? (page - 1) * limit;
        const [items, total] = await Promise.all([
            this.findMany({
                ...findOptions,
                limit,
                offset: actualOffset
            }),
            this.count({ where: findOptions.where })
        ]);
        return {
            items,
            total,
            page,
            pageSize: limit,
            totalPages: Math.ceil(total / limit)
        };
    }
    async findOne(options) {
        return await this.model.findFirst(options);
    }
    async findById(id, options) {
        return await this.model.findUnique({
            where: { id },
            ...options
        });
    }
    async count(options = {}) {
        return await this.model.count(options);
    }
    async create(options) {
        try {
            const startTime = Date.now();
            const result = await this.model.create(options);
            const duration = Date.now() - startTime;
            this.logger.log(`Created ${this.modelName} in ${duration}ms`, {
                id: result.id
            });
            return result;
        }
        catch (error) {
            this.logger.error(`Error creating ${this.modelName}`, error);
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
                throw this.errorHandler.createBusinessError(error_handler_service_1.ErrorCode.CONFLICT, `${this.modelName} already exists`, { metadata: { modelName: this.modelName } });
            }
            throw error;
        }
    }
    async update(options) {
        try {
            const startTime = Date.now();
            const result = await this.model.update(options);
            const duration = Date.now() - startTime;
            this.logger.log(`Updated ${this.modelName} in ${duration}ms`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error updating ${this.modelName}`, error);
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                throw this.errorHandler.createNotFoundError(this.modelName, 'Record not found');
            }
            throw error;
        }
    }
    async updateById(id, data, options) {
        return await this.update({
            where: { id },
            data,
            ...options
        });
    }
    async delete(options) {
        try {
            this.validateOwnershipInWhere(options.where);
            const result = await this.model.delete(options);
            this.logger.log(`Deleted ${this.modelName} with ownership validation`);
            return result;
        }
        catch (error) {
            this.logger.error(`Error deleting ${this.modelName}`, error);
            if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
                throw this.errorHandler.createNotFoundError(this.modelName, 'Record not found');
            }
            throw error;
        }
    }
    async deleteById(id) {
        this.logger.warn(`SECURITY WARNING: deleteById() called without owner validation for ${this.modelName}`, {
            id,
            stack: new Error().stack
        });
        return await this.delete({
            where: { id }
        });
    }
    validateOwnershipInWhere(where) {
        if (!where || typeof where !== 'object') {
            throw new Error(`Security violation: delete operations must include ownership validation`);
        }
        const hasOwnership = 'ownerId' in where ||
            'organizationId' in where ||
            'userId' in where ||
            ('AND' in where && Array.isArray(where.AND));
        if (!hasOwnership) {
            this.logger.error(`SECURITY VIOLATION: Delete attempted without ownership validation`, {
                modelName: this.modelName,
                where: JSON.stringify(where),
                stack: new Error().stack
            });
            throw new Error(`Security violation: delete operations must include ownership validation for ${this.modelName}`);
        }
    }
    async exists(where) {
        const count = await this.count({ where });
        return count > 0;
    }
    async findManyByOwner(ownerId, options = {}) {
        const whereWithOwner = this.addOwnerFilter(options.where || {}, ownerId);
        return await this.findMany({
            ...options,
            where: whereWithOwner
        });
    }
    async findManyByOwnerPaginated(ownerId, options = {}) {
        const whereWithOwner = this.addOwnerFilter(options.where || {}, ownerId);
        return await this.findManyPaginated({
            ...options,
            where: whereWithOwner
        });
    }
    addOwnerFilter(where, ownerId) {
        return {
            ...where,
            ownerId
        };
    }
    applySearchFilter(where, _search) {
        return where;
    }
    async findFirst(options = {}) {
        const { where, include, select } = options;
        return await this.model.findFirst({
            where,
            include,
            select
        });
    }
    async findByOwner(ownerId, options = {}) {
        return await this.findManyByOwner(ownerId, options);
    }
    async findByIdAndOwner(id, ownerId, _includeDetails) {
        const whereWithOwner = this.addOwnerFilter({ id }, ownerId);
        return await this.model.findFirst({
            where: whereWithOwner
        });
    }
    async getStatsByOwner(ownerId) {
        const total = await this.count({ where: this.addOwnerFilter({}, ownerId) });
        return { total };
    }
    parseQueryParams(query) {
        const limit = query.limit ? parseInt(String(query.limit)) : undefined;
        const offset = query.offset ? parseInt(String(query.offset)) : undefined;
        const page = query.page ? parseInt(String(query.page)) : undefined;
        return {
            ...query,
            limit,
            offset,
            page,
            search: query.search ? String(query.search).trim() : undefined
        };
    }
};
exports.BaseRepository = BaseRepository;
exports.BaseRepository = BaseRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BaseRepository);
