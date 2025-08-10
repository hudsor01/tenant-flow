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
exports.CreateLeaseDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const database_1 = require("@repo/database");
class CreateLeaseDto {
    constructor() {
        this.status = database_1.LeaseStatus.DRAFT;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { unitId: { required: true, type: () => String }, tenantId: { required: true, type: () => String }, propertyId: { required: false, type: () => String }, startDate: { required: true, type: () => String }, endDate: { required: true, type: () => String }, rentAmount: { required: true, type: () => Number }, securityDeposit: { required: true, type: () => Number }, lateFeeDays: { required: false, type: () => Number }, lateFeeAmount: { required: false, type: () => Number }, leaseTerms: { required: false, type: () => String }, status: { required: false, type: () => Object, default: database_1.LeaseStatus.DRAFT } };
    }
}
exports.CreateLeaseDto = CreateLeaseDto;
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Unit ID must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Unit ID is required' }),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "unitId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Tenant ID must be a valid UUID' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Tenant ID is required' }),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "tenantId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(4, { message: 'Property ID must be a valid UUID' }),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "propertyId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'Start date must be a valid ISO date string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Start date is required' }),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "startDate", void 0);
__decorate([
    (0, class_validator_1.IsDateString)({}, { message: 'End date must be a valid ISO date string' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'End date is required' }),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "endDate", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: 'Rent amount must be a number with at most 2 decimal places' }),
    (0, class_validator_1.IsPositive)({ message: 'Rent amount must be positive' }),
    (0, class_validator_1.Min)(1, { message: 'Rent amount must be at least $1' }),
    (0, class_validator_1.Max)(100000, { message: 'Rent amount cannot exceed $100,000' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateLeaseDto.prototype, "rentAmount", void 0);
__decorate([
    (0, class_validator_1.IsNumber)({ maxDecimalPlaces: 2 }, { message: 'Security deposit must be a number with at most 2 decimal places' }),
    (0, class_validator_1.Min)(0, { message: 'Security deposit cannot be negative' }),
    (0, class_validator_1.Max)(100000, { message: 'Security deposit cannot exceed $100,000' }),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateLeaseDto.prototype, "securityDeposit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Late fee days must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Late fee days cannot be negative' }),
    (0, class_validator_1.Max)(365, { message: 'Late fee days cannot exceed 365' }),
    __metadata("design:type", Number)
], CreateLeaseDto.prototype, "lateFeeDays", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Late fee amount must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Late fee amount cannot be negative' }),
    (0, class_validator_1.Max)(10000, { message: 'Late fee amount cannot exceed $10,000' }),
    __metadata("design:type", Number)
], CreateLeaseDto.prototype, "lateFeeAmount", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MinLength)(10, { message: 'Lease terms must be at least 10 characters long' }),
    (0, class_validator_1.MaxLength)(5000, { message: 'Lease terms cannot exceed 5000 characters' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "leaseTerms", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(database_1.LeaseStatus, { message: 'Status must be one of: DRAFT, ACTIVE, EXPIRED, TERMINATED' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateLeaseDto.prototype, "status", void 0);
