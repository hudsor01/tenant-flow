"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const auth_controller_1 = require("./auth.controller");
const auth_webhook_controller_1 = require("./auth-webhook.controller");
const jwt_auth_guard_1 = require("./guards/jwt-auth.guard");
const prisma_module_1 = require("../prisma/prisma.module");
const error_handler_service_1 = require("../common/errors/error-handler.service");
const email_module_1 = require("../email/email.module");
const users_module_1 = require("../users/users.module");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
            email_module_1.EmailModule,
            (0, common_1.forwardRef)(() => users_module_1.UsersModule)
        ],
        controllers: [auth_controller_1.AuthController, auth_webhook_controller_1.AuthWebhookController],
        providers: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard, error_handler_service_1.ErrorHandlerService],
        exports: [auth_service_1.AuthService, jwt_auth_guard_1.JwtAuthGuard]
    })
], AuthModule);
