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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseCrudController = BaseCrudController;
exports.EnhancedBaseCrudController = EnhancedBaseCrudController;
exports.createCrudController = createCrudController;
exports.CrudController = CrudController;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const interceptor_1 = require("../interceptors/interceptor");
const current_user_decorator_1 = require("../../auth/decorators/current-user.decorator");
function BaseCrudController(options) {
    const { entityName, enableStats = false, createValidationPipe = new common_1.ValidationPipe({ transform: true, whitelist: true }), updateValidationPipe = new common_1.ValidationPipe({ transform: true, whitelist: true }), queryValidationPipe = new common_1.ValidationPipe({ transform: true, whitelist: true }), additionalGuards = [], additionalInterceptors = [] } = options;
    const guards = [jwt_auth_guard_1.JwtAuthGuard, ...additionalGuards];
    const interceptors = [interceptor_1.AppInterceptor, ...additionalInterceptors];
    let BaseCrudControllerClass = class BaseCrudControllerClass {
        constructor(service) {
            this.service = service;
        }
        async findAll(user, query) {
            try {
                const entities = await this.service.findByOwner(user.id, query);
                return {
                    success: true,
                    data: entities,
                    message: `${entityName} retrieved successfully`
                };
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to retrieve ${entityName.toLowerCase()}s: ${errorMsg}`);
            }
        }
        async getStats(user) {
            if (!enableStats || !this.service.getStats) {
                throw new common_1.BadRequestException(`Stats not available for ${entityName.toLowerCase()}s`);
            }
            try {
                const stats = await this.service.getStats(user.id);
                return {
                    success: true,
                    data: stats,
                    message: `${entityName} stats retrieved successfully`
                };
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to retrieve ${entityName.toLowerCase()} stats: ${errorMsg}`);
            }
        }
        async findOne(id, user) {
            try {
                const entity = await this.service.findById(user.id, id);
                if (!entity) {
                    throw new common_1.BadRequestException(`${entityName} not found`);
                }
                return {
                    success: true,
                    data: entity,
                    message: `${entityName} retrieved successfully`
                };
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to retrieve ${entityName.toLowerCase()}: ${errorMsg}`);
            }
        }
        async create(createDto, user) {
            try {
                const entity = await this.service.create(user.id, createDto);
                return {
                    success: true,
                    data: entity,
                    message: `${entityName} created successfully`
                };
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to create ${entityName.toLowerCase()}: ${errorMsg}`);
            }
        }
        async update(id, updateDto, user) {
            try {
                const entity = await this.service.update(user.id, id, updateDto);
                return {
                    success: true,
                    data: entity,
                    message: `${entityName} updated successfully`
                };
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to update ${entityName.toLowerCase()}: ${errorMsg}`);
            }
        }
        async remove(id, user) {
            try {
                await this.service.delete(user.id, id);
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to delete ${entityName.toLowerCase()}: ${errorMsg}`);
            }
        }
    };
    __decorate([
        (0, common_1.Get)(),
        openapi.ApiResponse({ status: 200 }),
        __param(0, (0, current_user_decorator_1.CurrentUser)()),
        __param(1, (0, common_1.Query)(queryValidationPipe)),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object, Object]),
        __metadata("design:returntype", Promise)
    ], BaseCrudControllerClass.prototype, "findAll", null);
    __decorate([
        (0, common_1.Get)('stats'),
        openapi.ApiResponse({ status: 200 }),
        __param(0, (0, current_user_decorator_1.CurrentUser)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object]),
        __metadata("design:returntype", Promise)
    ], BaseCrudControllerClass.prototype, "getStats", null);
    __decorate([
        (0, common_1.Get)(':id'),
        openapi.ApiResponse({ status: 200 }),
        __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
        __param(1, (0, current_user_decorator_1.CurrentUser)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", Promise)
    ], BaseCrudControllerClass.prototype, "findOne", null);
    __decorate([
        (0, common_1.Post)(),
        (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
        openapi.ApiResponse({ status: common_1.HttpStatus.CREATED }),
        __param(0, (0, common_1.Body)(createValidationPipe)),
        __param(1, (0, current_user_decorator_1.CurrentUser)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Object, Object]),
        __metadata("design:returntype", Promise)
    ], BaseCrudControllerClass.prototype, "create", null);
    __decorate([
        (0, common_1.Put)(':id'),
        openapi.ApiResponse({ status: 200 }),
        __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
        __param(1, (0, common_1.Body)(updateValidationPipe)),
        __param(2, (0, current_user_decorator_1.CurrentUser)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object, Object]),
        __metadata("design:returntype", Promise)
    ], BaseCrudControllerClass.prototype, "update", null);
    __decorate([
        (0, common_1.Delete)(':id'),
        (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
        openapi.ApiResponse({ status: common_1.HttpStatus.NO_CONTENT }),
        __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
        __param(1, (0, current_user_decorator_1.CurrentUser)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", Promise)
    ], BaseCrudControllerClass.prototype, "remove", null);
    BaseCrudControllerClass = __decorate([
        (0, common_1.Controller)(),
        (0, common_1.UseGuards)(...guards),
        (0, common_1.UseInterceptors)(...interceptors),
        __metadata("design:paramtypes", [Object])
    ], BaseCrudControllerClass);
    return BaseCrudControllerClass;
}
function EnhancedBaseCrudController(options) {
    const { enableBulkOperations = false, enableArchive = false } = options;
    const BaseController = BaseCrudController(options);
    let EnhancedBaseCrudControllerClass = class EnhancedBaseCrudControllerClass extends BaseController {
        async bulkCreate(createDtos, user) {
            if (!enableBulkOperations) {
                throw new common_1.BadRequestException('Bulk operations not supported');
            }
            try {
                const entities = await Promise.all(createDtos.map(dto => this.service.create(user.id, dto)));
                return {
                    success: true,
                    data: entities,
                    message: `${entities.length} ${options.entityName.toLowerCase()}s created successfully`
                };
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to bulk create ${options.entityName.toLowerCase()}s: ${errorMsg}`);
            }
        }
        async archive(id, user) {
            if (!enableArchive) {
                throw new common_1.BadRequestException('Archive operation not supported');
            }
            try {
                const entity = await this.service.archive(user.id, id);
                return {
                    success: true,
                    data: entity,
                    message: `${options.entityName} archived successfully`
                };
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to archive ${options.entityName.toLowerCase()}: ${errorMsg}`);
            }
        }
        async restore(id, user) {
            if (!enableArchive) {
                throw new common_1.BadRequestException('Restore operation not supported');
            }
            try {
                const entity = await this.service.restore(user.id, id);
                return {
                    success: true,
                    data: entity,
                    message: `${options.entityName} restored successfully`
                };
            }
            catch (error) {
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                throw new common_1.BadRequestException(`Failed to restore ${options.entityName.toLowerCase()}: ${errorMsg}`);
            }
        }
    };
    __decorate([
        (0, common_1.Post)('bulk'),
        (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
        openapi.ApiResponse({ status: common_1.HttpStatus.CREATED }),
        __param(0, (0, common_1.Body)()),
        __param(1, (0, current_user_decorator_1.CurrentUser)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [Array, Object]),
        __metadata("design:returntype", Promise)
    ], EnhancedBaseCrudControllerClass.prototype, "bulkCreate", null);
    __decorate([
        (0, common_1.Put)(':id/archive'),
        openapi.ApiResponse({ status: 200 }),
        __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
        __param(1, (0, current_user_decorator_1.CurrentUser)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", Promise)
    ], EnhancedBaseCrudControllerClass.prototype, "archive", null);
    __decorate([
        (0, common_1.Put)(':id/restore'),
        openapi.ApiResponse({ status: 200 }),
        __param(0, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
        __param(1, (0, current_user_decorator_1.CurrentUser)()),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", [String, Object]),
        __metadata("design:returntype", Promise)
    ], EnhancedBaseCrudControllerClass.prototype, "restore", null);
    EnhancedBaseCrudControllerClass = __decorate([
        (0, common_1.Controller)()
    ], EnhancedBaseCrudControllerClass);
    return EnhancedBaseCrudControllerClass;
}
function createCrudController(entityName, service, options) {
    const ControllerClass = BaseCrudController({
        entityName,
        ...options
    });
    return new ControllerClass(service);
}
function CrudController(entityName, options) {
    return function (constructor) {
        const controllerOptions = {
            entityName,
            ...options
        };
        Reflect.defineMetadata('crud:options', controllerOptions, constructor);
        Reflect.defineMetadata('crud:entityName', entityName, constructor);
        return constructor;
    };
}
