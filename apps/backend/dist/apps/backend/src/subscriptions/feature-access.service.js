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
var FeatureAccessService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureAccessService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FeatureAccessService = FeatureAccessService_1 = class FeatureAccessService {
    constructor(prismaService) {
        this.prismaService = prismaService;
        this.logger = new common_1.Logger(FeatureAccessService_1.name);
    }
    async updateUserFeatureAccess(update) {
        try {
            const access = this.calculateFeatureAccess(update.subscriptionStatus, update.planType);
            await this.prismaService.userFeatureAccess.upsert({
                where: { userId: update.userId },
                create: {
                    userId: update.userId,
                    ...access,
                    lastUpdated: new Date(),
                    updateReason: update.reason
                },
                update: {
                    ...access,
                    lastUpdated: new Date(),
                    updateReason: update.reason
                }
            });
            await this.logAccessChange(update, access);
            this.logger.log(`Feature access updated for user ${update.userId}: ${update.reason}`);
        }
        catch (error) {
            this.logger.error(`Failed to update feature access for user ${update.userId}:`, error);
        }
    }
    async getUserFeatureAccess(userId) {
        try {
            const access = await this.prismaService.userFeatureAccess.findUnique({
                where: { userId }
            });
            if (!access) {
                return this.calculateFeatureAccess('CANCELED', 'FREETRIAL');
            }
            return {
                canExportData: access.canExportData,
                canAccessAdvancedAnalytics: access.canAccessAdvancedAnalytics,
                canUseBulkOperations: access.canUseBulkOperations,
                canAccessAPI: access.canAccessAPI,
                canInviteTeamMembers: access.canInviteTeamMembers,
                maxProperties: access.maxProperties,
                maxUnitsPerProperty: access.maxUnitsPerProperty,
                maxStorageGB: access.maxStorageGB,
                hasPrioritySupport: access.hasPrioritySupport,
                canUsePremiumIntegrations: access.canUsePremiumIntegrations
            };
        }
        catch (error) {
            this.logger.error(`Failed to get feature access for user ${userId}:`, error);
            return this.calculateFeatureAccess('CANCELED', 'STARTER');
        }
    }
    async canUserAccessFeature(userId, feature) {
        const access = await this.getUserFeatureAccess(userId);
        switch (feature) {
            case 'data_export':
                return {
                    allowed: access.canExportData,
                    reason: access.canExportData ? undefined : 'Data export requires an active subscription',
                    upgradeRequired: !access.canExportData
                };
            case 'advanced_analytics':
                return {
                    allowed: access.canAccessAdvancedAnalytics,
                    reason: access.canAccessAdvancedAnalytics ? undefined : 'Advanced analytics requires an active subscription',
                    upgradeRequired: !access.canAccessAdvancedAnalytics
                };
            case 'bulk_operations':
                return {
                    allowed: access.canUseBulkOperations,
                    reason: access.canUseBulkOperations ? undefined : 'Bulk operations require an active subscription',
                    upgradeRequired: !access.canUseBulkOperations
                };
            case 'api_access':
                return {
                    allowed: access.canAccessAPI,
                    reason: access.canAccessAPI ? undefined : 'API access requires an active subscription',
                    upgradeRequired: !access.canAccessAPI
                };
            case 'team_collaboration':
                return {
                    allowed: access.canInviteTeamMembers,
                    reason: access.canInviteTeamMembers ? undefined : 'Team collaboration requires an active subscription',
                    upgradeRequired: !access.canInviteTeamMembers
                };
            case 'premium_integrations':
                return {
                    allowed: access.canUsePremiumIntegrations,
                    reason: access.canUsePremiumIntegrations ? undefined : 'Premium integrations require an active subscription',
                    upgradeRequired: !access.canUsePremiumIntegrations
                };
            default:
                return { allowed: true };
        }
    }
    async enforceFeatureLimits(userId) {
        const access = await this.getUserFeatureAccess(userId);
        const limitsEnforced = [];
        const propertyCount = await this.prismaService.property.count({
            where: { User: { id: userId } }
        });
        const propertiesAtLimit = propertyCount >= access.maxProperties;
        if (propertiesAtLimit) {
            limitsEnforced.push(`Property limit reached (${access.maxProperties})`);
        }
        const storageUsedGB = await this.calculateUserStorageUsage(userId);
        const storageAtLimit = storageUsedGB >= access.maxStorageGB;
        if (storageAtLimit) {
            limitsEnforced.push(`Storage limit reached (${access.maxStorageGB}GB)`);
        }
        return {
            propertiesAtLimit,
            storageAtLimit,
            limitsEnforced
        };
    }
    async restoreUserAccess(userId, planType) {
        await this.updateUserFeatureAccess({
            userId,
            subscriptionStatus: 'ACTIVE',
            planType,
            reason: 'SUBSCRIPTION_ACTIVATED'
        });
        this.logger.log(`Access restored for user ${userId} on ${planType} plan`);
    }
    async restrictUserAccess(userId, reason) {
        const restrictedStatus = reason === 'SUBSCRIPTION_CANCELED' ? 'CANCELED' : 'INCOMPLETE';
        await this.updateUserFeatureAccess({
            userId,
            subscriptionStatus: restrictedStatus,
            planType: 'FREETRIAL',
            reason
        });
        this.logger.log(`Access restricted for user ${userId}: ${reason}`);
    }
    calculateFeatureAccess(status, planType) {
        const planFeatures = this.getPlanFeatures(planType);
        const isActiveSubscription = ['ACTIVE', 'TRIALING'].includes(status);
        if (!isActiveSubscription) {
            return {
                canExportData: false,
                canAccessAdvancedAnalytics: false,
                canUseBulkOperations: false,
                canAccessAPI: false,
                canInviteTeamMembers: false,
                maxProperties: 1,
                maxUnitsPerProperty: 5,
                maxStorageGB: 0.1,
                hasPrioritySupport: false,
                canUsePremiumIntegrations: false
            };
        }
        return planFeatures;
    }
    getPlanFeatures(planType) {
        switch (planType) {
            case 'FREETRIAL':
                return {
                    canExportData: false,
                    canAccessAdvancedAnalytics: false,
                    canUseBulkOperations: false,
                    canAccessAPI: false,
                    canInviteTeamMembers: false,
                    maxProperties: 1,
                    maxUnitsPerProperty: 5,
                    maxStorageGB: 0.1,
                    hasPrioritySupport: false,
                    canUsePremiumIntegrations: false
                };
            case 'STARTER':
                return {
                    canExportData: true,
                    canAccessAdvancedAnalytics: false,
                    canUseBulkOperations: false,
                    canAccessAPI: false,
                    canInviteTeamMembers: false,
                    maxProperties: 25,
                    maxUnitsPerProperty: 25,
                    maxStorageGB: 5,
                    hasPrioritySupport: false,
                    canUsePremiumIntegrations: false
                };
            case 'GROWTH':
                return {
                    canExportData: true,
                    canAccessAdvancedAnalytics: true,
                    canUseBulkOperations: true,
                    canAccessAPI: true,
                    canInviteTeamMembers: true,
                    maxProperties: 150,
                    maxUnitsPerProperty: 150,
                    maxStorageGB: 25,
                    hasPrioritySupport: false,
                    canUsePremiumIntegrations: true
                };
            case 'TENANTFLOW_MAX':
                return {
                    canExportData: true,
                    canAccessAdvancedAnalytics: true,
                    canUseBulkOperations: true,
                    canAccessAPI: true,
                    canInviteTeamMembers: true,
                    maxProperties: 999999,
                    maxUnitsPerProperty: 999999,
                    maxStorageGB: 999999,
                    hasPrioritySupport: true,
                    canUsePremiumIntegrations: true
                };
            default:
                return this.getPlanFeatures('FREETRIAL');
        }
    }
    async logAccessChange(update, access) {
        try {
            await this.prismaService.userAccessLog.create({
                data: {
                    userId: update.userId,
                    subscriptionStatus: update.subscriptionStatus,
                    planType: update.planType,
                    reason: update.reason,
                    accessGranted: JSON.parse(JSON.stringify(access)),
                    timestamp: new Date()
                }
            });
        }
        catch (error) {
            this.logger.error('Failed to log access change:', error);
        }
    }
    async calculateUserStorageUsage(userId) {
        try {
            const fileRecords = await this.prismaService.document.findMany({
                where: {
                    Property: { User: { id: userId } }
                },
                select: { fileSizeBytes: true }
            });
            const totalBytes = fileRecords.reduce((sum, file) => sum + Number(file.fileSizeBytes || 0n), 0);
            return totalBytes / (1024 * 1024 * 1024);
        }
        catch (error) {
            this.logger.error(`Failed to calculate storage usage for user ${userId}:`, error);
            return 0;
        }
    }
};
exports.FeatureAccessService = FeatureAccessService;
exports.FeatureAccessService = FeatureAccessService = FeatureAccessService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FeatureAccessService);
