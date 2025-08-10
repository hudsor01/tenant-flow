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
exports.UsageLimitsGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const feature_access_service_1 = require("../feature-access.service");
const usage_limits_decorator_1 = require("../decorators/usage-limits.decorator");
let UsageLimitsGuard = class UsageLimitsGuard {
    constructor(reflector, featureAccessService) {
        this.reflector = reflector;
        this.featureAccessService = featureAccessService;
    }
    async canActivate(context) {
        const limitConfig = this.reflector.getAllAndOverride(usage_limits_decorator_1.USAGE_LIMIT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!limitConfig) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user?.id) {
            throw new common_1.ForbiddenException('User authentication required');
        }
        const limits = await this.featureAccessService.enforceFeatureLimits(user.id);
        switch (limitConfig.resource) {
            case 'properties':
                if (limits.propertiesAtLimit && limitConfig.action === 'create') {
                    throw new common_1.ForbiddenException({
                        message: limitConfig.message || 'Property limit reached. Upgrade your plan to add more properties.',
                        limitType: 'properties',
                        upgradeRequired: true
                    });
                }
                break;
            case 'storage':
                if (limits.storageAtLimit && limitConfig.action === 'upload') {
                    throw new common_1.ForbiddenException({
                        message: limitConfig.message || 'Storage limit reached. Upgrade your plan for more storage.',
                        limitType: 'storage',
                        upgradeRequired: true
                    });
                }
                break;
            case 'units':
                break;
        }
        return true;
    }
};
exports.UsageLimitsGuard = UsageLimitsGuard;
exports.UsageLimitsGuard = UsageLimitsGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        feature_access_service_1.FeatureAccessService])
], UsageLimitsGuard);
