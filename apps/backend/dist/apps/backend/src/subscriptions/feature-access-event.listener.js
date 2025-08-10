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
var FeatureAccessEventListener_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeatureAccessEventListener = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const feature_access_service_1 = require("./feature-access.service");
const subscription_events_1 = require("../common/events/subscription.events");
let FeatureAccessEventListener = FeatureAccessEventListener_1 = class FeatureAccessEventListener {
    constructor(featureAccessService) {
        this.featureAccessService = featureAccessService;
        this.logger = new common_1.Logger(FeatureAccessEventListener_1.name);
    }
    async handleFeatureAccessRestrict(event) {
        try {
            this.logger.debug('Handling feature access restrict event', { event });
            await this.featureAccessService.restrictUserAccess(event.userId, event.reason);
            this.logger.debug('Feature access restricted successfully', {
                userId: event.userId,
                reason: event.reason
            });
        }
        catch (error) {
            this.logger.error('Failed to handle feature access restrict event', error);
        }
    }
    async handleFeatureAccessRestore(event) {
        try {
            this.logger.debug('Handling feature access restore event', { event });
            await this.featureAccessService.restoreUserAccess(event.userId, event.planType);
            this.logger.debug('Feature access restored successfully', {
                userId: event.userId,
                planType: event.planType
            });
        }
        catch (error) {
            this.logger.error('Failed to handle feature access restore event', error);
        }
    }
};
exports.FeatureAccessEventListener = FeatureAccessEventListener;
__decorate([
    (0, event_emitter_1.OnEvent)(subscription_events_1.SubscriptionEventType.FEATURE_ACCESS_RESTRICT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FeatureAccessEventListener.prototype, "handleFeatureAccessRestrict", null);
__decorate([
    (0, event_emitter_1.OnEvent)(subscription_events_1.SubscriptionEventType.FEATURE_ACCESS_RESTORE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FeatureAccessEventListener.prototype, "handleFeatureAccessRestore", null);
exports.FeatureAccessEventListener = FeatureAccessEventListener = FeatureAccessEventListener_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [feature_access_service_1.FeatureAccessService])
], FeatureAccessEventListener);
