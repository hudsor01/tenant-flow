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
exports.CreateDocumentDto = void 0;
const openapi = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const database_1 = require("@repo/database");
class CreateDocumentDto {
    static _OPENAPI_METADATA_FACTORY() {
        return { name: { required: true, type: () => String }, filename: { required: false, type: () => String }, url: { required: true, type: () => String }, type: { required: true, type: () => Object }, mimeType: { required: false, type: () => String }, fileSizeBytes: { required: false, type: () => Number }, propertyId: { required: false, type: () => String }, leaseId: { required: false, type: () => String } };
    }
}
exports.CreateDocumentDto = CreateDocumentDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)({ message: 'Document name is required' }),
    (0, class_validator_1.MinLength)(1, { message: 'Document name must be at least 1 character' }),
    (0, class_validator_1.MaxLength)(255, { message: 'Document name cannot exceed 255 characters' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "name", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.MaxLength)(255, { message: 'Filename cannot exceed 255 characters' }),
    (0, class_transformer_1.Transform)(({ value }) => value?.trim()),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "filename", void 0);
__decorate([
    (0, class_validator_1.IsUrl)({}, { message: 'URL must be a valid URL' }),
    (0, class_validator_1.IsNotEmpty)({ message: 'Document URL is required' }),
    (0, class_validator_1.MaxLength)(2048, { message: 'URL cannot exceed 2048 characters' }),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(database_1.DocumentType, {
        message: 'Document type must be one of: LEASE, INVOICE, RECEIPT, PROPERTY_PHOTO, INSPECTION, MAINTENANCE, OTHER'
    }),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.Matches)(/^[a-zA-Z0-9/\-+.]+$/, {
        message: 'MIME type must be a valid format (e.g., application/pdf, image/jpeg)'
    }),
    (0, class_validator_1.MaxLength)(100, { message: 'MIME type cannot exceed 100 characters' }),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "mimeType", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsInt)({ message: 'File size must be an integer' }),
    (0, class_validator_1.Min)(0, { message: 'File size cannot be negative' }),
    (0, class_validator_1.Max)(104857600, { message: 'File size cannot exceed 100MB' }),
    __metadata("design:type", Number)
], CreateDocumentDto.prototype, "fileSizeBytes", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Property ID must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "propertyId", void 0);
__decorate([
    (0, class_validator_1.IsUUID)(4, { message: 'Lease ID must be a valid UUID' }),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateDocumentDto.prototype, "leaseId", void 0);
