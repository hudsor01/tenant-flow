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
exports.RLSController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const roles_decorator_1 = require("../../auth/decorators/roles.decorator");
const roles_guard_1 = require("../../auth/guards/roles.guard");
const rls_service_1 = require("./rls.service");
const shared_1 = require("@repo/shared");
let RLSController = class RLSController {
    constructor(rlsService) {
        this.rlsService = rlsService;
    }
    async getRLSStatus() {
        try {
            const status = await this.rlsService.verifyRLSEnabled();
            return {
                success: true,
                data: status,
                summary: {
                    total: status.length,
                    enabled: status.filter(s => s.enabled).length,
                    disabled: status.filter(s => !s.enabled).length
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new common_1.HttpException({
                error: {
                    message: 'Failed to retrieve RLS status',
                    code: 'RLS_STATUS_ERROR',
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    details: errorMessage
                }
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async generateAuditReport() {
        try {
            const report = await this.rlsService.generateRLSAuditReport();
            return {
                success: true,
                data: report
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                error: {
                    message: 'Failed to generate audit report',
                    code: 'RLS_AUDIT_ERROR',
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    details: error instanceof Error ? error.message : 'Unknown error'
                }
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async applyRLSPolicies() {
        try {
            const result = await this.rlsService.applyRLSPolicies();
            if (!result.success) {
                throw new common_1.HttpException({
                    error: {
                        message: 'Failed to apply some RLS policies',
                        code: 'RLS_APPLY_PARTIAL_FAILURE',
                        statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                        details: result.errors
                    }
                }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
            }
            return {
                success: true,
                message: 'RLS policies applied successfully'
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException) {
                throw error;
            }
            throw new common_1.HttpException({
                error: {
                    message: 'Failed to apply RLS policies',
                    code: 'RLS_APPLY_ERROR',
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    details: error instanceof Error ? error.message : 'Unknown error'
                }
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async testUserAccess(userId) {
        try {
            const userRole = 'OWNER';
            const results = await this.rlsService.testRLSPolicies(userId, userRole);
            return {
                success: true,
                userId,
                role: userRole,
                testResults: results
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                error: {
                    message: 'Failed to test RLS policies',
                    code: 'RLS_TEST_ERROR',
                    statusCode: common_1.HttpStatus.INTERNAL_SERVER_ERROR,
                    details: error instanceof Error ? error.message : 'Unknown error'
                }
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.RLSController = RLSController;
__decorate([
    (0, common_1.Get)('status'),
    (0, roles_decorator_1.Roles)(shared_1.USER_ROLE.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Get RLS status for all tables' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'RLS status retrieved successfully' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RLSController.prototype, "getRLSStatus", null);
__decorate([
    (0, common_1.Get)('audit'),
    (0, roles_decorator_1.Roles)(shared_1.USER_ROLE.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Generate RLS audit report' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Audit report generated successfully' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RLSController.prototype, "generateAuditReport", null);
__decorate([
    (0, common_1.Post)('apply'),
    (0, roles_decorator_1.Roles)(shared_1.USER_ROLE.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Apply RLS policies to database' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'RLS policies applied successfully' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'Failed to apply RLS policies' }),
    openapi.ApiResponse({ status: 201 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], RLSController.prototype, "applyRLSPolicies", null);
__decorate([
    (0, common_1.Get)('test/:userId'),
    (0, roles_decorator_1.Roles)(shared_1.USER_ROLE.ADMIN),
    (0, swagger_1.ApiOperation)({ summary: 'Test RLS policies for a specific user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'RLS test results' }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], RLSController.prototype, "testUserAccess", null);
exports.RLSController = RLSController = __decorate([
    (0, swagger_1.ApiTags)('RLS Management'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/admin/rls'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [rls_service_1.RLSService])
], RLSController);
