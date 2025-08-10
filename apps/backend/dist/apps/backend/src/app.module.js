"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const throttler_1 = require("@nestjs/throttler");
const event_emitter_1 = require("@nestjs/event-emitter");
const schedule_1 = require("@nestjs/schedule");
const core_1 = require("@nestjs/core");
const jwt_auth_guard_1 = require("./auth/guards/jwt-auth.guard");
const custom_throttler_guard_1 = require("./common/guards/custom-throttler.guard");
const auth_service_1 = require("./auth/auth.service");
const config_module_1 = require("./common/config/config.module");
const config_service_1 = require("./common/config/config.service");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const properties_module_1 = require("./properties/properties.module");
const tenants_module_1 = require("./tenants/tenants.module");
const units_module_1 = require("./units/units.module");
const leases_module_1 = require("./leases/leases.module");
const maintenance_module_1 = require("./maintenance/maintenance.module");
const documents_module_1 = require("./documents/documents.module");
const users_module_1 = require("./users/users.module");
const prisma_module_1 = require("./prisma/prisma.module");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const stripe_module_1 = require("./stripe/stripe.module");
const billing_module_1 = require("./billing/billing.module");
const notifications_module_1 = require("./notifications/notifications.module");
const health_module_1 = require("./health/health.module");
const error_module_1 = require("./common/errors/error.module");
const security_module_1 = require("./common/security/security.module");
const rls_module_1 = require("./database/rls/rls.module");
const pdf_module_1 = require("./common/pdf/pdf.module");
const logger_module_1 = require("./common/modules/logger.module");
const interceptor_1 = require("./common/interceptors/interceptor");
const error_handler_1 = require("./common/exceptions/error.handler");
const csrf_controller_1 = require("./common/controllers/csrf.controller");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.TypeSafeConfigModule,
            throttler_1.ThrottlerModule.forRootAsync({
                useFactory: (configService) => [
                    {
                        ttl: configService.rateLimit.ttl,
                        limit: configService.rateLimit.limit
                    }
                ],
                inject: [config_service_1.TypeSafeConfigService]
            }),
            prisma_module_1.PrismaModule,
            event_emitter_1.EventEmitterModule.forRoot(),
            schedule_1.ScheduleModule.forRoot(),
            security_module_1.SecurityModule,
            error_module_1.ErrorModule,
            logger_module_1.LoggerModule,
            rls_module_1.RLSModule,
            auth_module_1.AuthModule,
            properties_module_1.PropertiesModule,
            tenants_module_1.TenantsModule,
            units_module_1.UnitsModule,
            leases_module_1.LeasesModule,
            maintenance_module_1.MaintenanceModule,
            documents_module_1.DocumentsModule,
            users_module_1.UsersModule,
            subscriptions_module_1.SubscriptionsModule,
            stripe_module_1.StripeModule,
            billing_module_1.BillingModule,
            notifications_module_1.NotificationsModule,
            health_module_1.HealthModule,
            pdf_module_1.PDFModule,
        ],
        controllers: [app_controller_1.AppController, csrf_controller_1.CsrfController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_GUARD,
                useFactory: (authService, reflector) => {
                    return new jwt_auth_guard_1.JwtAuthGuard(authService, reflector);
                },
                inject: [auth_service_1.AuthService, core_1.Reflector]
            },
            {
                provide: core_1.APP_GUARD,
                useClass: custom_throttler_guard_1.CustomThrottlerGuard
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: interceptor_1.AppInterceptor,
            },
            {
                provide: core_1.APP_FILTER,
                useClass: error_handler_1.ErrorHandler,
            },
        ]
    })
], AppModule);
