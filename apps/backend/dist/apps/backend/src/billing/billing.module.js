"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BillingModule = void 0;
const common_1 = require("@nestjs/common");
const billing_controller_1 = require("./billing.controller");
const stripe_module_1 = require("../stripe/stripe.module");
const subscriptions_module_1 = require("../subscriptions/subscriptions.module");
const error_handler_module_1 = require("../common/errors/error-handler.module");
const performance_decorators_1 = require("../common/performance/performance.decorators");
let BillingModule = class BillingModule {
};
exports.BillingModule = BillingModule;
exports.BillingModule = BillingModule = __decorate([
    (0, performance_decorators_1.MeasureLoadTime)('BillingModule'),
    (0, common_1.Module)({
        imports: [
            stripe_module_1.StripeModule,
            (0, common_1.forwardRef)(() => subscriptions_module_1.SubscriptionsModule),
            error_handler_module_1.ErrorHandlerModule
        ],
        controllers: [billing_controller_1.BillingController],
        providers: [],
        exports: []
    })
], BillingModule);
