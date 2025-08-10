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
exports.UnitsRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const base_repository_1 = require("../common/repositories/base.repository");
let UnitsRepository = class UnitsRepository extends base_repository_1.BaseRepository {
    constructor(prisma) {
        super(prisma);
        this.modelName = 'unit';
    }
    addOwnerFilter(where, ownerId) {
        return {
            ...where,
            Property: {
                ownerId
            }
        };
    }
    applySearchFilter(where, search) {
        return {
            ...where,
            OR: [
                { unitNumber: { contains: search, mode: 'insensitive' } },
                { Property: { name: { contains: search, mode: 'insensitive' } } }
            ]
        };
    }
    async findByOwnerWithDetails(ownerId, options = {}) {
        const { search, status, propertyId, ...paginationOptions } = options;
        let where = this.addOwnerFilter({}, ownerId);
        if (propertyId) {
            where.propertyId = propertyId;
        }
        if (status) {
            where.status = status;
        }
        if (search) {
            where = this.applySearchFilter(where, search);
        }
        return await this.prisma.unit.findMany({
            where,
            include: {
                Property: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true
                    }
                },
                Lease: {
                    where: {
                        status: 'ACTIVE'
                    },
                    include: {
                        Tenant: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                MaintenanceRequest: {
                    where: {
                        status: {
                            not: 'COMPLETED'
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    take: 5
                },
                _count: {
                    select: {
                        Lease: true,
                        MaintenanceRequest: true
                    }
                }
            },
            orderBy: [
                {
                    Property: {
                        name: 'asc'
                    }
                },
                {
                    unitNumber: 'asc'
                }
            ],
            take: paginationOptions.limit ? Math.min(paginationOptions.limit, 1000) : undefined,
            skip: paginationOptions.offset || (paginationOptions.page ? (paginationOptions.page - 1) * (paginationOptions.limit || 20) : undefined)
        });
    }
    async findByPropertyAndOwner(propertyId, ownerId) {
        const property = await this.prisma.property.findFirst({
            where: {
                id: propertyId,
                ownerId
            }
        });
        if (!property) {
            return null;
        }
        return await this.prisma.unit.findMany({
            where: {
                propertyId
            },
            include: {
                Lease: {
                    where: {
                        status: 'ACTIVE'
                    },
                    include: {
                        Tenant: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                },
                MaintenanceRequest: {
                    where: {
                        status: {
                            not: 'COMPLETED'
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                _count: {
                    select: {
                        Lease: true,
                        MaintenanceRequest: true
                    }
                }
            },
            orderBy: {
                unitNumber: 'asc'
            }
        });
    }
    async findByIdAndOwner(id, ownerId, includeDetails = true) {
        const where = {
            id,
            Property: {
                ownerId
            }
        };
        return await this.model.findFirst({
            where,
            include: includeDetails ? {
                Property: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                        city: true,
                        state: true,
                        zipCode: true
                    }
                },
                Lease: {
                    include: {
                        Tenant: {
                            include: {
                                User: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true,
                                        phone: true,
                                        avatarUrl: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                },
                MaintenanceRequest: {
                    orderBy: {
                        createdAt: 'desc'
                    },
                    include: {
                        Expense: true
                    }
                },
                Inspection: {
                    orderBy: {
                        scheduledDate: 'desc'
                    },
                    take: 5
                }
            } : undefined
        });
    }
    async verifyPropertyOwnership(propertyId, ownerId) {
        const count = await this.prisma.property.count({
            where: {
                id: propertyId,
                ownerId
            }
        });
        return count > 0;
    }
    async hasActiveLeases(id, ownerId) {
        const count = await this.model.count({
            where: {
                id,
                Property: {
                    ownerId
                },
                Lease: {
                    some: {
                        status: 'ACTIVE'
                    }
                }
            }
        });
        return count > 0;
    }
    async getStatsByOwner(ownerId) {
        const [totalUnits, occupiedUnits, vacantUnits, maintenanceUnits] = await Promise.all([
            this.model.count({
                where: {
                    Property: {
                        ownerId
                    }
                }
            }),
            this.model.count({
                where: {
                    Property: {
                        ownerId
                    },
                    Lease: {
                        some: {
                            status: 'ACTIVE'
                        }
                    }
                }
            }),
            this.model.count({
                where: {
                    Property: {
                        ownerId
                    },
                    status: 'VACANT'
                }
            }),
            this.model.count({
                where: {
                    Property: {
                        ownerId
                    },
                    status: 'MAINTENANCE'
                }
            })
        ]);
        const rentStats = await this.prisma.unit.aggregate({
            where: {
                Property: {
                    ownerId
                }
            },
            _avg: {
                rent: true
            },
            _sum: {
                rent: true
            }
        });
        return {
            totalUnits,
            occupiedUnits,
            vacantUnits,
            maintenanceUnits,
            averageRent: rentStats._avg.rent || 0,
            totalRentPotential: rentStats._sum.rent || 0,
            occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0
        };
    }
};
exports.UnitsRepository = UnitsRepository;
exports.UnitsRepository = UnitsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UnitsRepository);
