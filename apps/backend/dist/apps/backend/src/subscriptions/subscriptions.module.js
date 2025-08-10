"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionsModule = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_controller_1 = require("./subscriptions.controller");
const subscriptions_manager_service_1 = require("./subscriptions-manager.service");
const subscription_status_service_1 = require("./subscription-status.service");
const feature_access_service_1 = require("./feature-access.service");
const feature_access_event_listener_1 = require("./feature-access-event.listener");
const prisma_module_1 = require("../prisma/prisma.module");
let SubscriptionsModule = class SubscriptionsModule {
};
exports.SubscriptionsModule = SubscriptionsModule;
exports.SubscriptionsModule = SubscriptionsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule
        ],
        controllers: [
            subscriptions_controller_1.SubscriptionsController
        ],
        providers: [
            subscriptions_manager_service_1.SubscriptionsManagerService,
            subscription_status_service_1.SubscriptionStatusService,
            feature_access_service_1.FeatureAccessService,
            feature_access_event_listener_1.FeatureAccessEventListener
        ],
        exports: [
            subscriptions_manager_service_1.SubscriptionsManagerService,
            subscription_status_service_1.SubscriptionStatusService,
            feature_access_service_1.FeatureAccessService
        ]
    })
], SubscriptionsModule);
