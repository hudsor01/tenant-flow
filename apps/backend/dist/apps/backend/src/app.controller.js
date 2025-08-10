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
exports.AppController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const app_service_1 = require("./app.service");
const prisma_service_1 = require("./prisma/prisma.service");
const config_1 = require("@nestjs/config");
const public_decorator_1 = require("./auth/decorators/public.decorator");
const multi_tenant_prisma_service_1 = require("./common/prisma/multi-tenant-prisma.service");
let AppController = class AppController {
    constructor(appService, prismaService, configService, multiTenantPrismaService) {
        this.appService = appService;
        this.prismaService = prismaService;
        this.configService = configService;
        this.multiTenantPrismaService = multiTenantPrismaService;
    }
    getHello() {
        return this.appService?.getHello() || 'TenantFlow Backend API';
    }
    ping() {
        return { pong: true, timestamp: Date.now() };
    }
    async getDetailedHealth() {
        const databaseUrl = this.configService.get('DATABASE_URL');
        const hasDatabaseUrl = !!databaseUrl;
        let dbStatus = 'unknown';
        let dbLatency;
        let dbError = null;
        try {
            const start = Date.now();
            await Promise.race([
                this.prismaService.$queryRaw `SELECT 1`,
                new Promise((_, reject) => setTimeout(() => reject(new Error('DB timeout')), 5000))
            ]);
            dbStatus = 'connected';
            dbLatency = Date.now() - start;
        }
        catch (error) {
            dbStatus = 'error';
            dbError = {
                message: error instanceof Error ? error.message : 'Unknown error',
                code: error?.code,
                meta: error?.meta,
                stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined
            };
        }
        return {
            status: dbStatus === 'connected' ? 'ok' : 'degraded',
            timestamp: new Date().toISOString(),
            service: 'tenantflow-api',
            version: '1.0.0',
            uptime: process.uptime(),
            environment: this.configService.get('NODE_ENV'),
            port: this.configService.get('PORT'),
            database: {
                status: dbStatus,
                latency: dbLatency ? `${dbLatency}ms` : undefined,
                configured: hasDatabaseUrl,
                urlPrefix: databaseUrl ? databaseUrl.substring(0, 15) + '...' : 'not set',
                error: dbError
            }
        };
    }
    async getPerformanceMetrics() {
        try {
            const poolStats = this.multiTenantPrismaService.getPoolStats();
            return {
                status: 'ok',
                timestamp: new Date().toISOString(),
                multiTenant: {
                    poolStats,
                    summary: {
                        totalTenantClients: poolStats.activeConnections,
                        maxPoolSize: poolStats.maxPoolSize,
                        averageClientAge: this.calculateAverageClientAge(poolStats.clients)
                    }
                }
            };
        }
        catch (error) {
            return {
                status: 'error',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    calculateAverageClientAge(clients) {
        if (clients.length === 0)
            return 0;
        const totalAge = clients.reduce((sum, client) => sum + client.ageMinutes, 0);
        return Math.round(totalAge / clients.length);
    }
};
exports.AppController = AppController;
__decorate([
    (0, common_1.Get)('api'),
    (0, public_decorator_1.Public)(),
    openapi.ApiResponse({ status: 200, type: String }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], AppController.prototype, "getHello", null);
__decorate([
    (0, common_1.Get)('ping'),
    (0, public_decorator_1.Public)(),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AppController.prototype, "ping", null);
__decorate([
    (0, common_1.Get)('health/detailed'),
    (0, public_decorator_1.Public)(),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getDetailedHealth", null);
__decorate([
    (0, common_1.Get)('health/performance'),
    (0, public_decorator_1.Public)(),
    openapi.ApiResponse({ status: 200, type: Object }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AppController.prototype, "getPerformanceMetrics", null);
exports.AppController = AppController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [app_service_1.AppService,
        prisma_service_1.PrismaService,
        config_1.ConfigService,
        multi_tenant_prisma_service_1.MultiTenantPrismaService])
], AppController);
