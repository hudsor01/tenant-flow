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
exports.UnitQueryDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const database_1 = require("@repo/database");
class UnitQueryDto {
    constructor() {
        this.limit = 20;
        this.offset = 0;
        this.sortBy = 'unitNumber';
        this.sortOrder = 'asc';
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { search: { required: false, type: () => String }, propertyId: { required: false, type: () => String }, status: { required: false, type: () => Object }, type: { required: false, type: () => String }, bedroomsMin: { required: false, type: () => Number }, bedroomsMax: { required: false, type: () => Number }, bathroomsMin: { required: false, type: () => Number }, bathroomsMax: { required: false, type: () => Number }, rentMin: { required: false, type: () => Number }, rentMax: { required: false, type: () => Number }, limit: { required: false, type: () => Number, default: 20 }, offset: { required: false, type: () => Number, default: 0 }, sortBy: { required: false, type: () => String, default: "unitNumber" }, sortOrder: { required: false, type: () => Object, default: "asc" } };
    }
}
exports.UnitQueryDto = UnitQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], UnitQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(4, { message: 'Property ID must be a valid UUID' }),
    __metadata("design:type", String)
], UnitQueryDto.prototype, "propertyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['VACANT', 'OCCUPIED', 'MAINTENANCE', 'UNAVAILABLE'], {
        message: 'Status must be one of: VACANT, OCCUPIED, MAINTENANCE, UNAVAILABLE'
    }),
    __metadata("design:type", String)
], UnitQueryDto.prototype, "status", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], UnitQueryDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Bedrooms min must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Bedrooms min cannot be negative' }),
    __metadata("design:type", Number)
], UnitQueryDto.prototype, "bedroomsMin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Bedrooms max must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Bedrooms max cannot be negative' }),
    __metadata("design:type", Number)
], UnitQueryDto.prototype, "bedroomsMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Bathrooms min must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Bathrooms min cannot be negative' }),
    __metadata("design:type", Number)
], UnitQueryDto.prototype, "bathroomsMin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Bathrooms max must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Bathrooms max cannot be negative' }),
    __metadata("design:type", Number)
], UnitQueryDto.prototype, "bathroomsMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Rent min must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Rent min cannot be negative' }),
    __metadata("design:type", Number)
], UnitQueryDto.prototype, "rentMin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsNumber)({}, { message: 'Rent max must be a number' }),
    (0, class_validator_1.Min)(0, { message: 'Rent max cannot be negative' }),
    __metadata("design:type", Number)
], UnitQueryDto.prototype, "rentMax", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Limit must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'Limit must be at least 1' }),
    (0, class_validator_1.Max)(100, { message: 'Limit cannot exceed 100' }),
    __metadata("design:type", Number)
], UnitQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Offset must be an integer' }),
    (0, class_validator_1.Min)(0, { message: 'Offset cannot be negative' }),
    __metadata("design:type", Number)
], UnitQueryDto.prototype, "offset", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsEnum)(['unitNumber', 'rent', 'status', 'createdAt', 'updatedAt'], {
        message: 'Sort by must be one of: unitNumber, rent, status, createdAt, updatedAt'
    }),
    __metadata("design:type", String)
], UnitQueryDto.prototype, "sortBy", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(['asc', 'desc'], {
        message: 'Sort order must be either asc or desc'
    }),
    __metadata("design:type", String)
], UnitQueryDto.prototype, "sortOrder", void 0);
