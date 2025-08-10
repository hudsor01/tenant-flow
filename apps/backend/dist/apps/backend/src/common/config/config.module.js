"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeSafeConfigModule = void 0;
exports.validateConfig = validateConfig;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const config_service_1 = require("./config.service");
const config_schema_1 = require("./config.schema");
function validateConfig(config) {
    const result = config_schema_1.configSchema.safeParse(config);
    if (!result.success) {
        const errorMessages = result.error.issues.map((error) => {
            const path = error.path.join('.');
            return `${path}: ${error.message}`;
        });
        const errorMessage = `Configuration validation failed:\n${errorMessages.join('\n')}`;
        throw new Error(errorMessage);
    }
    return result.data;
}
let TypeSafeConfigModule = class TypeSafeConfigModule {
};
exports.TypeSafeConfigModule = TypeSafeConfigModule;
exports.TypeSafeConfigModule = TypeSafeConfigModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: process.env.NODE_ENV === 'production' ? [] : ['.env.local', '.env'],
                ignoreEnvFile: process.env.NODE_ENV === 'production',
                validate: validateConfig,
                validationOptions: {
                    allowUnknown: true,
                    abortEarly: false
                },
                expandVariables: true
            })
        ],
        providers: [config_service_1.TypeSafeConfigService],
        exports: [config_service_1.TypeSafeConfigService]
    })
], TypeSafeConfigModule);
