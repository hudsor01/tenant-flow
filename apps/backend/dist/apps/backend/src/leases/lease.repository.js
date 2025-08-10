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
exports.LeaseRepository = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@repo/database");
const prisma_service_1 = require("../prisma/prisma.service");
const base_repository_1 = require("../common/repositories/base.repository");
let LeaseRepository = class LeaseRepository extends base_repository_1.BaseRepository {
    constructor(prisma) {
        super(prisma);
        this.modelName = 'lease';
    }
    get prismaClient() {
        return this.prisma;
    }
    applySearchFilter(where, search) {
        return {
            ...where,
            OR: [
                { terms: { contains: search, mode: 'insensitive' } },
                {
                    Tenant: {
                        OR: [
                            { firstName: { contains: search, mode: 'insensitive' } },
                            { lastName: { contains: search, mode: 'insensitive' } },
                            { email: { contains: search, mode: 'insensitive' } }
                        ]
                    }
                },
                {
                    Unit: {
                        OR: [
                            { unitNumber: { contains: search, mode: 'insensitive' } },
                            { Property: { name: { contains: search, mode: 'insensitive' } } }
                        ]
                    }
                }
            ]
        };
    }
    addOwnerFilter(where, ownerId) {
        return {
            ...where,
            Unit: {
                Property: {
                    ownerId
                }
            }
        };
    }
    async findByOwner(ownerId, options = {}) {
        const leaseOptions = options;
        const { search, ...paginationOptions } = leaseOptions;
        let where = {};
        where = this.addOwnerFilter(where, ownerId);
        if (leaseOptions.status) {
            where.status = leaseOptions.status;
        }
        if (leaseOptions.unitId) {
            where.unitId = leaseOptions.unitId;
        }
        if (leaseOptions.tenantId) {
            where.tenantId = leaseOptions.tenantId;
        }
        if (leaseOptions.startDateFrom || leaseOptions.startDateTo) {
            where.startDate = {};
            if (leaseOptions.startDateFrom) {
                where.startDate.gte = new Date(leaseOptions.startDateFrom);
            }
            if (leaseOptions.startDateTo) {
                where.startDate.lte = new Date(leaseOptions.startDateTo);
            }
        }
        if (leaseOptions.endDateFrom || leaseOptions.endDateTo) {
            where.endDate = {};
            if (leaseOptions.endDateFrom) {
                where.endDate.gte = new Date(leaseOptions.endDateFrom);
            }
            if (leaseOptions.endDateTo) {
                where.endDate.lte = new Date(leaseOptions.endDateTo);
            }
        }
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.findMany({
            where,
            include: {
                Unit: true,
                Tenant: true,
                _count: true
            },
            orderBy: {
                startDate: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        });
    }
    async getStatsByOwner(ownerId) {
        const baseWhere = this.addOwnerFilter({}, ownerId);
        const [totalCount, activeCount, draftCount, expiredCount, terminatedCount, expiringCount] = await Promise.all([
            this.count({ where: baseWhere }),
            this.count({ where: { ...baseWhere, status: database_1.LeaseStatus.ACTIVE } }),
            this.count({ where: { ...baseWhere, status: database_1.LeaseStatus.DRAFT } }),
            this.count({ where: { ...baseWhere, status: database_1.LeaseStatus.EXPIRED } }),
            this.count({ where: { ...baseWhere, status: database_1.LeaseStatus.TERMINATED } }),
            this.count({
                where: {
                    ...baseWhere,
                    status: database_1.LeaseStatus.ACTIVE,
                    endDate: {
                        gte: new Date(),
                        lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                    }
                }
            })
        ]);
        return {
            totalLeases: totalCount,
            activeLeases: activeCount,
            draftLeases: draftCount,
            expiredLeases: expiredCount,
            terminatedLeases: terminatedCount,
            expiringLeases: expiringCount
        };
    }
    async findByIdAndOwner(id, ownerId) {
        return await this.findOne({
            where: {
                id,
                Unit: {
                    Property: {
                        ownerId
                    }
                }
            },
            include: {
                Unit: true,
                Tenant: true,
                Document: true
            }
        });
    }
    async findByUnit(unitId, ownerId, options = {}) {
        const { search, ...paginationOptions } = options;
        let where = {
            unitId,
            Unit: {
                Property: {
                    ownerId
                }
            }
        };
        if (options.status) {
            where.status = options.status;
        }
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.findMany({
            where,
            include: {
                Tenant: true
            },
            orderBy: {
                startDate: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        });
    }
    async findByTenant(tenantId, ownerId, options = {}) {
        const { search, ...paginationOptions } = options;
        let where = {
            tenantId,
            Unit: {
                Property: {
                    ownerId
                }
            }
        };
        if (options.status) {
            where.status = options.status;
        }
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.findMany({
            where,
            include: {
                Unit: true
            },
            orderBy: {
                startDate: 'desc'
            },
            ...this.parseQueryParams(paginationOptions)
        });
    }
    async checkLeaseConflict(unitId, startDate, endDate, excludeLeaseId) {
        const where = {
            unitId,
            status: {
                in: [database_1.LeaseStatus.ACTIVE, database_1.LeaseStatus.DRAFT]
            },
            OR: [
                {
                    AND: [
                        { startDate: { lte: startDate } },
                        { endDate: { gte: startDate } }
                    ]
                },
                {
                    AND: [
                        { startDate: { lte: endDate } },
                        { endDate: { gte: endDate } }
                    ]
                },
                {
                    AND: [
                        { startDate: { gte: startDate } },
                        { endDate: { lte: endDate } }
                    ]
                }
            ]
        };
        if (excludeLeaseId) {
            where.id = { not: excludeLeaseId };
        }
        const conflictingLease = await this.findOne({ where });
        return !!conflictingLease;
    }
};
exports.LeaseRepository = LeaseRepository;
exports.LeaseRepository = LeaseRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], LeaseRepository);
