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
exports.UnitsController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const units_service_1 = require("./units.service");
const dto_1 = require("./dto");
const base_crud_controller_1 = require("../common/controllers/base-crud.controller");
const service_adapter_1 = require("../common/adapters/service.adapter");
const current_user_decorator_1 = require("../auth/decorators/current-user.decorator");
const UnitsCrudController = (0, base_crud_controller_1.BaseCrudController)({
    entityName: 'Unit',
    enableStats: true
});
let UnitsController = class UnitsController extends UnitsCrudController {
    constructor(unitsService) {
        super((0, service_adapter_1.adaptBaseCrudService)(unitsService));
        this.unitsService = unitsService;
    }
    async findAll(user, query) {
        if (query?.propertyId) {
            const units = await this.unitsService.getUnitsByProperty(query.propertyId, user.id);
            return {
                success: true,
                data: units,
                message: 'Units retrieved successfully'
            };
        }
        return super.findAll(user, query || {});
    }
};
exports.UnitsController = UnitsController;
__decorate([
    (0, common_1.Get)(),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, dto_1.UnitQueryDto]),
    __metadata("design:returntype", Promise)
], UnitsController.prototype, "findAll", null);
exports.UnitsController = UnitsController = __decorate([
    (0, common_1.Controller)('units'),
    __metadata("design:paramtypes", [units_service_1.UnitsService])
], UnitsController);
