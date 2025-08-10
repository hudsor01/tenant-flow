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
exports.FeatureAccessGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const feature_access_service_1 = require("../feature-access.service");
const feature_required_decorator_1 = require("../decorators/feature-required.decorator");
let FeatureAccessGuard = class FeatureAccessGuard {
    constructor(reflector, featureAccessService) {
        this.reflector = reflector;
        this.featureAccessService = featureAccessService;
    }
    async canActivate(context) {
        const requiredFeature = this.reflector.getAllAndOverride(feature_required_decorator_1.FEATURE_REQUIRED_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredFeature) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user?.id) {
            throw new common_1.ForbiddenException('User authentication required');
        }
        const accessCheck = await this.featureAccessService.canUserAccessFeature(user.id, requiredFeature);
        if (!accessCheck.allowed) {
            throw new common_1.ForbiddenException({
                message: accessCheck.reason || 'Access denied',
                upgradeRequired: accessCheck.upgradeRequired || false,
                feature: requiredFeature
            });
        }
        return true;
    }
};
exports.FeatureAccessGuard = FeatureAccessGuard;
exports.FeatureAccessGuard = FeatureAccessGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        feature_access_service_1.FeatureAccessService])
], FeatureAccessGuard);
