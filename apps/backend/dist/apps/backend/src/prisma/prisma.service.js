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
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const database_1 = require("@repo/database");
const config_1 = require("@nestjs/config");
let PrismaService = PrismaService_1 = class PrismaService extends database_1.PrismaClient {
    constructor(configService) {
        const datasourceUrl = configService.get('DATABASE_URL');
        super({
            datasources: {
                db: { url: datasourceUrl }
            },
            log: configService.get('NODE_ENV') === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
        });
        this.configService = configService;
        this.logger = new common_1.Logger(PrismaService_1.name);
        this.logger.log('🔧 PrismaService constructor called');
        this.logger.log(`🔧 ConfigService available: ${!!configService}`);
        this.logger.log(`🔧 DATABASE_URL configured: ${!!datasourceUrl}`);
        this.logger.log('✅ PrismaService constructor completed');
    }
    async onModuleInit() {
        this.logger.log('🔄 PrismaService onModuleInit() starting...');
        try {
            this.logger.log('🔄 Attempting database connection...');
            const connectPromise = this.$connect();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000));
            await Promise.race([connectPromise, timeoutPromise]);
            this.logger.log('✅ Database connection established');
        }
        catch (error) {
            this.logger.error('❌ Failed to connect to database:', error);
            if (process.env.NODE_ENV === 'production') {
                this.logger.warn('⚠️  Continuing in production mode despite DB connection failure');
            }
            else {
                this.logger.warn('⚠️  Continuing in development mode despite DB connection failure');
                this.logger.warn('⚠️  Some features may not work without database connection');
            }
        }
        this.logger.log('✅ PrismaService onModuleInit() completed');
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
    async cleanDb() {
        if (this.configService.get('NODE_ENV') === 'production') {
            throw new Error('cleanDb is not allowed in production');
        }
        const modelNames = ['property', 'unit', 'tenant', 'lease', 'maintenanceRequest', 'user', 'subscription', 'webhookEvent', 'document'];
        return Promise.all(modelNames.map((modelName) => {
            const model = this[modelName];
            if (model && typeof model.deleteMany === 'function') {
                return model.deleteMany();
            }
            return Promise.resolve();
        }));
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PrismaService);
