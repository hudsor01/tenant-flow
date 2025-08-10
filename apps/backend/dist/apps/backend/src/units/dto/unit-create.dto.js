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
exports.UnitCreateDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const database_1 = require("@repo/database");
class UnitCreateDto {
    constructor() {
        this.status = 'VACANT';
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { unitNumber: { required: true, type: () => String }, propertyId: { required: true, type: () => String }, bedrooms: { required: true, type: () => Number }, bathrooms: { required: true, type: () => Number }, squareFeet: { required: false, type: () => Number }, monthlyRent: { required: true, type: () => Number }, securityDeposit: { required: false, type: () => Number }, description: { required: false, type: () => String }, amenities: { required: false, type: () => [String] }, status: { required: false, type: () => Object, default: "VACANT" } };
    }
}
exports.UnitCreateDto = UnitCreateDto;
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Unit number is required' }),
    (0, class_validator_1.IsString)({ message: 'Unit number must be a string' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], UnitCreateDto.prototype, "unitNumber", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Property ID is required' }),
    (0, class_validator_1.IsUUID)(4, { message: 'Property ID must be a valid UUID' }),
    __metadata("design:type", String)
], UnitCreateDto.prototype, "propertyId", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Bedrooms is required' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Bedrooms must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Bedrooms cannot be negative' }),
    (0, class_validator_1.Max)(20, { message: 'Bedrooms cannot exceed 20' }),
    __metadata("design:type", Number)
], UnitCreateDto.prototype, "bedrooms", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Bathrooms is required' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Bathrooms must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Bathrooms cannot be negative' }),
    (0, class_validator_1.Max)(20, { message: 'Bathrooms cannot exceed 20' }),
    __metadata("design:type", Number)
], UnitCreateDto.prototype, "bathrooms", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Square feet must be a number' }),
    (0, class_validator_1.Min)(1, { message: 'Square feet must be positive' }),
    (0, class_validator_1.Max)(50000, { message: 'Square feet cannot exceed 50,000' }),
    __metadata("design:type", Number)
], UnitCreateDto.prototype, "squareFeet", void 0);
__decorate([
    (0, class_validator_1.IsNotEmpty)({ message: 'Monthly rent is required' }),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Monthly rent must be a number' }),
    (0, class_validator_1.IsPositive)({ message: 'Monthly rent must be positive' }),
    (0, class_validator_1.Max)(100000, { message: 'Monthly rent cannot exceed $100,000' }),
    __metadata("design:type", Number)
], UnitCreateDto.prototype, "monthlyRent", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Security deposit must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Security deposit cannot be negative' }),
    (0, class_validator_1.Max)(100000, { message: 'Security deposit cannot exceed $100,000' }),
    __metadata("design:type", Number)
], UnitCreateDto.prototype, "securityDeposit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)({ message: 'Description must be a string' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], UnitCreateDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsArray)({ message: 'Amenities must be an array' }),
    (0, class_validator_1.IsString)({ each: true, message: 'Each amenity must be a string' }),
    __metadata("design:type", Array)
], UnitCreateDto.prototype, "amenities", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'], {
        message: 'Status must be one of: VACANT, OCCUPIED, MAINTENANCE, UNAVAILABLE'
    }),
    __metadata("design:type", String)
], UnitCreateDto.prototype, "status", void 0);
