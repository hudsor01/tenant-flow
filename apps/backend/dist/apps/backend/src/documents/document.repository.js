"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentRepository = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@repo/database");
const base_repository_1 = require("../common/repositories/base.repository");
let DocumentRepository = class DocumentRepository extends base_repository_1.BaseRepository {
    constructor() {
        super(...arguments);
        this.modelName = 'document';
    }
    async create(options) {
        return await super.create(options);
    }
    async update(options) {
        return await super.update(options);
    }
    async delete(options) {
        return await super.delete(options);
    }
    async findMany(options) {
        return await super.findMany(options);
    }
    get prismaClient() {
        return this.prisma;
    }
    applySearchFilter(where, search) {
        return {
            ...where,
            OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { filename: { contains: search, mode: 'insensitive' } },
                { mimeType: { contains: search, mode: 'insensitive' } },
                {
                    Property: {
                        name: { contains: search, mode: 'insensitive' }
                    }
                },
                {
                    Lease: {
                        Unit: {
                            unitNumber: { contains: search, mode: 'insensitive' }
                        }
                    }
                }
            ]
        };
    }
    addOwnerFilter(where, ownerId) {
        return {
            ...where,
            OR: [
                {
                    Property: {
                        ownerId
                    }
                },
                {
                    Lease: {
                        Unit: {
                            Property: {
                                ownerId
                            }
                        }
                    }
                }
            ]
        };
    }
    async findManyByOwner(ownerId, options = {}) {
        const documentOptions = options;
        const { search, ...paginationOptions } = documentOptions;
        let where = {};
        where = this.addOwnerFilter(where, ownerId);
        if (documentOptions.type) {
            where.type = documentOptions.type;
        }
        if (documentOptions.propertyId) {
            where.propertyId = documentOptions.propertyId;
        }
        if (documentOptions.leaseId) {
            where.leaseId = documentOptions.leaseId;
        }
        if (documentOptions.mimeType) {
            where.mimeType = { contains: documentOptions.mimeType, mode: 'insensitive' };
        }
        if (documentOptions.createdFrom || documentOptions.createdTo) {
            where.createdAt = {};
            if (documentOptions.createdFrom) {
                where.createdAt.gte = new Date(documentOptions.createdFrom);
            }
            if (documentOptions.createdTo) {
                where.createdAt.lte = new Date(documentOptions.createdTo);
            }
        }
        if (documentOptions.minFileSize !== undefined || documentOptions.maxFileSize !== undefined) {
            where.fileSizeBytes = {};
            if (documentOptions.minFileSize !== undefined) {
                where.fileSizeBytes.gte = documentOptions.minFileSize;
            }
            if (documentOptions.maxFileSize !== undefined) {
                where.fileSizeBytes.lte = documentOptions.maxFileSize;
            }
        }
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        });
    }
    async findByOwner(ownerId, options = {}) {
        const documentOptions = options;
        const { search, ...paginationOptions } = documentOptions;
        let where = {};
        where = this.addOwnerFilter(where, ownerId);
        if (documentOptions.type) {
            where.type = documentOptions.type;
        }
        if (documentOptions.propertyId) {
            where.propertyId = documentOptions.propertyId;
        }
        if (documentOptions.leaseId) {
            where.leaseId = documentOptions.leaseId;
        }
        if (documentOptions.mimeType) {
            where.mimeType = { contains: documentOptions.mimeType, mode: 'insensitive' };
        }
        if (documentOptions.createdFrom || documentOptions.createdTo) {
            where.createdAt = {};
            if (documentOptions.createdFrom) {
                where.createdAt.gte = new Date(documentOptions.createdFrom);
            }
            if (documentOptions.createdTo) {
                where.createdAt.lte = new Date(documentOptions.createdTo);
            }
        }
        if (documentOptions.minFileSize !== undefined || documentOptions.maxFileSize !== undefined) {
            where.fileSizeBytes = {};
            if (documentOptions.minFileSize !== undefined) {
                where.fileSizeBytes.gte = documentOptions.minFileSize;
            }
            if (documentOptions.maxFileSize !== undefined) {
                where.fileSizeBytes.lte = documentOptions.maxFileSize;
            }
        }
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.findMany({
            where,
            include: {
                Property: true,
                Lease: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        });
    }
    async getStatsByOwner(ownerId) {
        const baseWhere = this.addOwnerFilter({}, ownerId);
        const [totalCount, leaseDocsCount, invoiceCount, receiptCount, photoCount, totalSizeResult] = await Promise.all([
            this.count({ where: baseWhere }),
            this.count({ where: { ...baseWhere, type: database_1.DocumentType.LEASE } }),
            this.count({ where: { ...baseWhere, type: database_1.DocumentType.INVOICE } }),
            this.count({ where: { ...baseWhere, type: database_1.DocumentType.RECEIPT } }),
            this.count({ where: { ...baseWhere, type: database_1.DocumentType.PROPERTY_PHOTO } }),
            this.prismaClient.document.aggregate({
                where: baseWhere,
                _sum: {
                    fileSizeBytes: true
                }
            })
        ]);
        return {
            totalDocuments: totalCount,
            leaseDocuments: leaseDocsCount,
            invoices: invoiceCount,
            receipts: receiptCount,
            propertyPhotos: photoCount,
            totalStorageBytes: Number(totalSizeResult._sum.fileSizeBytes || 0)
        };
    }
    async findByIdAndOwner(id, ownerId) {
        return await this.findOne({
            where: {
                id,
                OR: [
                    {
                        Property: {
                            ownerId
                        }
                    },
                    {
                        Lease: {
                            Unit: {
                                Property: {
                                    ownerId
                                }
                            }
                        }
                    }
                ]
            },
            include: {
                Property: true,
                Lease: true
            }
        });
    }
    async findByProperty(propertyId, ownerId, options = {}) {
        const { search, ...paginationOptions } = options;
        let where = {
            propertyId,
            Property: {
                ownerId
            }
        };
        if (options.type) {
            where.type = options.type;
        }
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.findMany({
            where,
            orderBy: {
                createdAt: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        });
    }
    async findByLease(leaseId, ownerId, options = {}) {
        const { search, ...paginationOptions } = options;
        let where = {
            leaseId,
            Lease: {
                Unit: {
                    Property: {
                        ownerId
                    }
                }
            }
        };
        if (options.type) {
            where.type = options.type;
        }
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.findMany({
            where,
            include: {
                Lease: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        });
    }
    async findByType(type, ownerId, options = {}) {
        const { search, ...paginationOptions } = options;
        let where = {
            type
        };
        where = this.addOwnerFilter(where, ownerId);
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.findMany({
            where,
            include: {
                Property: true,
                Lease: true
            },
            orderBy: {
                createdAt: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        });
    }
};
exports.DocumentRepository = DocumentRepository;
exports.DocumentRepository = DocumentRepository = __decorate([
    (0, common_1.Injectable)()
], DocumentRepository);
