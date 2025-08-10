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
exports.LeasesController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const leases_service_1 = require("./leases.service");
const lease_pdf_service_1 = require("./services/lease-pdf.service");
const dto_1 = require("./dto");
const base_crud_controller_1 = require("../common/controllers/base-crud.controller");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const LeasesCrudController = (0, base_crud_controller_1.BaseCrudController)({
    entityName: 'Lease',
    enableStats: true
});
let LeasesController = class LeasesController extends LeasesCrudController {
    constructor(leasesService, leasePDFService) {
        super(leasesService);
        this.leasesService = leasesService;
        this.leasePDFService = leasePDFService;
    }
    async getLeasesByUnit(unitId, user, query) {
        const leases = await this.leasesService.getByUnit(unitId, user.id, query);
        return {
            success: true,
            data: leases,
            message: 'Leases retrieved successfully'
        };
    }
    async getLeasesByTenant(tenantId, user, query) {
        const leases = await this.leasesService.getByTenant(tenantId, user.id, query);
        return {
            success: true,
            data: leases,
            message: 'Leases retrieved successfully'
        };
    }
    async generateLeasePDF(leaseId, user, response, format, includeBranding) {
        const options = {
            format: format || 'Letter',
            includeBranding: includeBranding === 'true',
            includePageNumbers: true
        };
        const result = await this.leasePDFService.generateLeasePDF(leaseId, user.id, options);
        response.setHeader('Content-Type', result.mimeType);
        response.setHeader('Content-Length', result.size.toString());
        response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
        response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        response.setHeader('Pragma', 'no-cache');
        response.setHeader('Expires', '0');
        response.end(result.buffer);
    }
};
exports.LeasesController = LeasesController;
__decorate([
    (0, common_1.Get)('by-unit/:unitId'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('unitId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.LeaseQueryDto]),
    __metadata("design:returntype", Promise)
], LeasesController.prototype, "getLeasesByUnit", null);
__decorate([
    (0, common_1.Get)('by-tenant/:tenantId'),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('tenantId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, dto_1.LeaseQueryDto]),
    __metadata("design:returntype", Promise)
], LeasesController.prototype, "getLeasesByTenant", null);
__decorate([
    (0, common_1.Get)(':id/pdf'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate lease agreement PDF',
        description: 'Generate a professional PDF lease agreement document'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'PDF generated successfully',
        headers: {
            'Content-Type': { description: 'application/pdf' },
            'Content-Disposition': { description: 'attachment; filename="lease.pdf"' }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Lease not found' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'PDF generation failed' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Query)('format')),
    __param(4, (0, common_1.Query)('branding')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], LeasesController.prototype, "generateLeasePDF", null);
exports.LeasesController = LeasesController = __decorate([
    (0, swagger_1.ApiTags)('Leases'),
    (0, common_1.Controller)('leases'),
    __metadata("design:paramtypes", [leases_service_1.LeasesService,
        lease_pdf_service_1.LeasePDFService])
], LeasesController);
