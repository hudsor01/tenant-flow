"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const performance_decorators_1 = require("../common/performance/performance.decorators");
const stripe_service_1 = require("./stripe.service");
const stripe_db_service_1 = require("./stripe-db.service");
const stripe_billing_service_1 = require("./stripe-billing.service");
const stripe_checkout_service_1 = require("./stripe-checkout.service");
const stripe_error_handler_1 = require("./stripe-error.handler");
const payment_recovery_service_1 = require("./payment-recovery.service");
const webhook_controller_1 = require("./webhook.controller");
const webhook_service_1 = require("./webhook.service");
const stripe_checkout_controller_1 = require("./stripe-checkout.controller");
const prisma_module_1 = require("../prisma/prisma.module");
const email_module_1 = require("../email/email.module");
let StripeModule = class StripeModule {
};
exports.StripeModule = StripeModule;
exports.StripeModule = StripeModule = __decorate([
    (0, performance_decorators_1.MeasureLoadTime)('StripeModule'),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            email_module_1.EmailModule,
            axios_1.HttpModule
        ],
        controllers: [webhook_controller_1.WebhookController, stripe_checkout_controller_1.StripeCheckoutController],
        providers: [
            stripe_service_1.StripeService,
            stripe_db_service_1.StripeDBService,
            stripe_billing_service_1.StripeBillingService,
            stripe_checkout_service_1.StripeCheckoutService,
            stripe_error_handler_1.StripeErrorHandler,
            payment_recovery_service_1.PaymentRecoveryService,
            webhook_service_1.WebhookService
        ],
        exports: [
            stripe_service_1.StripeService,
            stripe_db_service_1.StripeDBService,
            stripe_billing_service_1.StripeBillingService,
            stripe_checkout_service_1.StripeCheckoutService,
            payment_recovery_service_1.PaymentRecoveryService,
            webhook_service_1.WebhookService
        ]
    })
], StripeModule);
