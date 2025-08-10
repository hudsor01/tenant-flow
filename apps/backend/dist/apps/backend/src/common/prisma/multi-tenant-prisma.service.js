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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MultiTenantPrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiTenantPrismaService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@repo/database");
const prisma_service_1 = require("../../prisma/prisma.service");
const type_guards_1 = require("../security/type-guards");
let MultiTenantPrismaService = MultiTenantPrismaService_1 = class MultiTenantPrismaService {
    constructor(prisma) {
        this.prisma = prisma;
        this.logger = new common_1.Logger(MultiTenantPrismaService_1.name);
        this.tenantClients = new Map();
        this.MAX_POOL_SIZE = 10;
        this.CLIENT_TTL = 300000;
        this.adminPrisma = this.prisma;
        this.logger.log('MultiTenantPrismaService constructor completed');
    }
    async onModuleInit() {
        this.logger.log('🔄 MultiTenantPrismaService onModuleInit() starting...');
        try {
            setInterval(() => this.cleanupUnusedClients(), this.CLIENT_TTL);
            this.logger.log('✅ MultiTenantPrismaService onModuleInit() completed successfully');
        }
        catch (error) {
            this.logger.error('❌ Failed to initialize MultiTenantPrismaService:', error);
            throw error;
        }
    }
    async onModuleDestroy() {
        for (const [userId, { client }] of Array.from(this.tenantClients)) {
            try {
                await client.$disconnect();
                this.logger.debug(`Disconnected tenant client for user ${userId}`);
            }
            catch (error) {
                this.logger.warn(`Failed to disconnect tenant client for user ${userId}:`, error);
            }
        }
        this.tenantClients.clear();
    }
    cleanupUnusedClients() {
        const now = new Date();
        const clientsToRemove = [];
        for (const [userId, { lastUsed }] of Array.from(this.tenantClients)) {
            if (now.getTime() - lastUsed.getTime() > this.CLIENT_TTL) {
                clientsToRemove.push(userId);
            }
        }
        for (const userId of clientsToRemove) {
            const entry = this.tenantClients.get(userId);
            if (entry) {
                entry.client.$disconnect().catch(error => {
                    this.logger.warn(`Failed to disconnect unused client for user ${userId}:`, error);
                });
                this.tenantClients.delete(userId);
                this.logger.debug(`Cleaned up unused tenant client for user ${userId}`);
            }
        }
    }
    getAdminClient() {
        return this.adminPrisma;
    }
    async getTenantClient(userId) {
        if (!(0, type_guards_1.isValidUserId)(userId)) {
            this.logger.error('Security validation failed for userId in getTenantClient', {
                userId: String(userId).substring(0, 8) + '...'
            });
            throw new Error('Invalid userId provided - security validation failed');
        }
        const existing = this.tenantClients.get(userId);
        if (existing) {
            existing.lastUsed = new Date();
            this.logger.debug(`Reusing existing tenant client for user ${userId}`);
            return existing.client;
        }
        if (this.tenantClients.size >= this.MAX_POOL_SIZE) {
            const oldestEntry = Array.from(this.tenantClients.entries())
                .sort((a, b) => a[1].lastUsed.getTime() - b[1].lastUsed.getTime())[0];
            if (oldestEntry) {
                const [oldUserId, { client }] = oldestEntry;
                await client.$disconnect().catch(error => {
                    this.logger.warn(`Failed to disconnect client for user ${oldUserId}:`, error);
                });
                this.tenantClients.delete(oldUserId);
                this.logger.debug(`Evicted oldest tenant client for user ${oldUserId}`);
            }
        }
        try {
            const tenantPrisma = new database_1.PrismaClient({
                datasources: {
                    db: {
                        url: process.env.DATABASE_URL
                    }
                },
                log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
            });
            await tenantPrisma.$transaction(async (tx) => {
                const claims = { sub: userId };
                const validatedClaims = (0, type_guards_1.validateJWTClaims)(claims);
                if (!validatedClaims) {
                    throw new Error('JWT claims validation failed for RLS context');
                }
                const jwtClaims = JSON.stringify(validatedClaims);
                await tx.$executeRaw `SET LOCAL request.jwt.claims = ${jwtClaims}::jsonb`;
                this.logger.debug('RLS context set successfully with validated claims', {
                    userId: userId.substring(0, 8) + '...',
                    claimsLength: jwtClaims.length
                });
            });
            this.tenantClients.set(userId, {
                client: tenantPrisma,
                lastUsed: new Date()
            });
            this.logger.debug(`Created new tenant client for user ${userId}`);
            return tenantPrisma;
        }
        catch (error) {
            this.logger.error(`Failed to create tenant client for user ${userId}:`, error);
            throw new Error(`Failed to initialize tenant database connection: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async withTenantContext(userId, callback) {
        if (!(0, type_guards_1.isValidUserId)(userId)) {
            this.logger.error('Security validation failed for userId in withTenantContext', {
                userId: String(userId).substring(0, 8) + '...'
            });
            throw new Error('Invalid userId provided - security validation failed');
        }
        if (typeof callback !== 'function') {
            throw new Error('Callback must be a function');
        }
        try {
            const tenantPrisma = await this.getTenantClient(userId);
            const result = await tenantPrisma.$transaction(async (tx) => {
                return callback(tx);
            }, {
                timeout: 30000,
                isolationLevel: 'ReadCommitted'
            });
            return result;
        }
        catch (error) {
            this.logger.error(`Error in withTenantContext for user ${userId}:`, {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                userId
            });
            if (error instanceof Error) {
                throw new Error(`Tenant operation failed: ${error.message}`);
            }
            throw new Error('Tenant operation failed with unknown error');
        }
    }
    async disconnectTenantClient(userId) {
        const entry = this.tenantClients.get(userId);
        if (entry) {
            try {
                await entry.client.$disconnect();
                this.tenantClients.delete(userId);
                this.logger.debug(`Manually disconnected tenant client for user ${userId}`);
            }
            catch (error) {
                this.logger.warn(`Failed to disconnect tenant client for user ${userId}:`, error);
                this.tenantClients.delete(userId);
            }
        }
    }
    getPoolStats() {
        return {
            activeConnections: this.tenantClients.size,
            maxPoolSize: this.MAX_POOL_SIZE,
            clientTTL: this.CLIENT_TTL,
            clients: Array.from(this.tenantClients.entries()).map(([userId, { lastUsed }]) => ({
                userId: userId.substring(0, 8) + '...',
                lastUsed: lastUsed.toISOString(),
                ageMinutes: Math.round((Date.now() - lastUsed.getTime()) / 60000)
            }))
        };
    }
};
exports.MultiTenantPrismaService = MultiTenantPrismaService;
exports.MultiTenantPrismaService = MultiTenantPrismaService = MultiTenantPrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => prisma_service_1.PrismaService))),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MultiTenantPrismaService);
