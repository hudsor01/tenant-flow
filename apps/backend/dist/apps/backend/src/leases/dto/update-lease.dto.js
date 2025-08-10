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
exports.UpdateLeaseDto = void 0;
const openapi = require("@nestjs/swagger");
const mapped_types_1 = require("@nestjs/mapped-types");
const create_lease_dto_1 = require("./create-lease.dto");
const class_validator_1 = require("class-validator");
const database_1 = require("@repo/database");
class UpdateLeaseDto extends (0, mapped_types_1.PartialType)(create_lease_dto_1.CreateLeaseDto) {
    static _OPENAPI_METADATA_FACTORY() {
        return { status: { required: false, type: () => Object }, startDate: { required: false, type: () => String }, endDate: { required: false, type: () => String } };
    }
}
exports.UpdateLeaseDto = UpdateLeaseDto;
__decorate([
    (0, class_validator_1.IsEnum)(database_1.LeaseStatus, { message: 'Status must be one of: DRAFT, ACTIVE, EXPIRED, TERMINATED' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLeaseDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Start date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLeaseDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'End date must be a valid ISO date string' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateLeaseDto.prototype, "endDate", void 0);
