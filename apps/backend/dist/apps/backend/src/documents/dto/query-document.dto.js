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
exports.DocumentQueryDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const database_1 = require("@repo/database");
class DocumentQueryDto {
    constructor() {
        this.page = 1;
        this.limit = 20;
    }
    static _OPENAPI_METADATA_FACTORY() {
        return { type: { required: false, type: () => Object }, propertyId: { required: false, type: () => String }, leaseId: { required: false, type: () => String }, mimeType: { required: false, type: () => String }, createdFrom: { required: false, type: () => String }, createdTo: { required: false, type: () => String }, minFileSize: { required: false, type: () => Number }, maxFileSize: { required: false, type: () => Number }, search: { required: false, type: () => String }, page: { required: false, type: () => Number, default: 1 }, limit: { required: false, type: () => Number, default: 20 }, offset: { required: false, type: () => Number } };
    }
}
exports.DocumentQueryDto = DocumentQueryDto;
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(database_1.DocumentType, {
        message: 'Document type must be one of: LEASE, INVOICE, RECEIPT, PROPERTY_PHOTO, INSPECTION, MAINTENANCE, OTHER'
    }),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(4, { message: 'Property ID must be a valid UUID' }),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "propertyId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsUUID)(4, { message: 'Lease ID must be a valid UUID' }),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "leaseId", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'Created from date must be a valid ISO date string' }),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "createdFrom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)({}, { message: 'Created to date must be a valid ISO date string' }),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "createdTo", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Min file size must be an integer' }),
    (0, class_validator_1.Min)(0, { message: 'Min file size cannot be negative' }),
    __metadata("design:type", Number)
], DocumentQueryDto.prototype, "minFileSize", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Max file size must be an integer' }),
    (0, class_validator_1.Min)(0, { message: 'Max file size cannot be negative' }),
    __metadata("design:type", Number)
], DocumentQueryDto.prototype, "maxFileSize", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], DocumentQueryDto.prototype, "search", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Page must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'Page must be at least 1' }),
    __metadata("design:type", Number)
], DocumentQueryDto.prototype, "page", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Limit must be an integer' }),
    (0, class_validator_1.Min)(1, { message: 'Limit must be at least 1' }),
    (0, class_validator_1.Max)(100, { message: 'Limit cannot exceed 100' }),
    __metadata("design:type", Number)
], DocumentQueryDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'Offset must be an integer' }),
    (0, class_validator_1.Min)(0, { message: 'Offset must be at least 0' }),
    __metadata("design:type", Number)
], DocumentQueryDto.prototype, "offset", void 0);
