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
exports.PDFController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const pdf_generator_service_1 = require("./pdf-generator.service");
const jwt_auth_guard_1 = require("../../auth/guards/jwt-auth.guard");
const error_handler_service_1 = require("../errors/error-handler.service");
class PDFMarginDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PDFMarginDto.prototype, "top", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PDFMarginDto.prototype, "right", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PDFMarginDto.prototype, "bottom", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], PDFMarginDto.prototype, "left", void 0);
class GeneratePDFDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFDto.prototype, "html", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFDto.prototype, "filename", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['A4', 'Letter', 'Legal']),
    __metadata("design:type", String)
], GeneratePDFDto.prototype, "format", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PDFMarginDto),
    __metadata("design:type", PDFMarginDto)
], GeneratePDFDto.prototype, "margin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFDto.prototype, "css", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], GeneratePDFDto.prototype, "includePageNumbers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFDto.prototype, "headerTemplate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFDto.prototype, "footerTemplate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    __metadata("design:type", Number)
], GeneratePDFDto.prototype, "scale", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], GeneratePDFDto.prototype, "printBackground", void 0);
class GeneratePDFFromURLDto {
}
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFFromURLDto.prototype, "url", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFFromURLDto.prototype, "filename", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsIn)(['A4', 'Letter', 'Legal']),
    __metadata("design:type", String)
], GeneratePDFFromURLDto.prototype, "format", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)(),
    (0, class_transformer_1.Type)(() => PDFMarginDto),
    __metadata("design:type", PDFMarginDto)
], GeneratePDFFromURLDto.prototype, "margin", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], GeneratePDFFromURLDto.prototype, "includePageNumbers", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFFromURLDto.prototype, "headerTemplate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], GeneratePDFFromURLDto.prototype, "footerTemplate", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => parseFloat(value)),
    __metadata("design:type", Number)
], GeneratePDFFromURLDto.prototype, "scale", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    (0, class_transformer_1.Transform)(({ value }) => value === 'true' || value === true),
    __metadata("design:type", Boolean)
], GeneratePDFFromURLDto.prototype, "printBackground", void 0);
let PDFController = class PDFController {
    constructor(pdfService, errorHandler) {
        this.pdfService = pdfService;
        this.errorHandler = errorHandler;
    }
    async generatePDF(dto, response) {
        try {
            const options = {
                html: dto.html,
                filename: dto.filename,
                format: dto.format,
                margin: dto.margin,
                css: dto.css,
                includePageNumbers: dto.includePageNumbers,
                headerTemplate: dto.headerTemplate,
                footerTemplate: dto.footerTemplate,
                scale: dto.scale,
                printBackground: dto.printBackground
            };
            const result = await this.pdfService.generatePDF(options);
            response.setHeader('Content-Type', result.mimeType);
            response.setHeader('Content-Length', result.size.toString());
            response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            response.setHeader('Pragma', 'no-cache');
            response.setHeader('Expires', '0');
            response.end(result.buffer);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'generatePDF',
                resource: 'pdf',
                metadata: { filename: dto.filename }
            });
        }
    }
    async generatePDFFromURL(dto, response) {
        try {
            const pdfOptions = {
                format: dto.format,
                margin: dto.margin,
                includePageNumbers: dto.includePageNumbers,
                headerTemplate: dto.headerTemplate,
                footerTemplate: dto.footerTemplate,
                scale: dto.scale,
                printBackground: dto.printBackground
            };
            const result = await this.pdfService.generatePDFFromURL(dto.url, dto.filename, pdfOptions);
            response.setHeader('Content-Type', result.mimeType);
            response.setHeader('Content-Length', result.size.toString());
            response.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
            response.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            response.setHeader('Pragma', 'no-cache');
            response.setHeader('Expires', '0');
            response.end(result.buffer);
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'generatePDFFromURL',
                resource: 'pdf',
                metadata: { url: dto.url, filename: dto.filename }
            });
        }
    }
    async healthCheck() {
        try {
            const healthStatus = await this.pdfService.healthCheck();
            return {
                ...healthStatus,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'healthCheck',
                resource: 'pdf'
            });
        }
    }
};
exports.PDFController = PDFController;
__decorate([
    (0, common_1.Post)('generate'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate PDF from HTML content',
        description: 'Convert HTML content to PDF with customizable formatting options'
    }),
    (0, swagger_1.ApiBody)({ type: GeneratePDFDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'PDF generated successfully',
        headers: {
            'Content-Type': { description: 'application/pdf' },
            'Content-Disposition': { description: 'attachment; filename="document.pdf"' }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid input parameters' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'PDF generation failed' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GeneratePDFDto, Object]),
    __metadata("design:returntype", Promise)
], PDFController.prototype, "generatePDF", null);
__decorate([
    (0, common_1.Post)('generate-from-url'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate PDF from URL',
        description: 'Convert a web page to PDF by providing its URL'
    }),
    (0, swagger_1.ApiBody)({ type: GeneratePDFFromURLDto }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'PDF generated successfully from URL',
        headers: {
            'Content-Type': { description: 'application/pdf' },
            'Content-Disposition': { description: 'attachment; filename="webpage.pdf"' }
        }
    }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Invalid URL or parameters' }),
    (0, swagger_1.ApiResponse)({ status: 500, description: 'PDF generation failed' }),
    openapi.ApiResponse({ status: common_1.HttpStatus.OK }),
    __param(0, (0, common_1.Body)(common_1.ValidationPipe)),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [GeneratePDFFromURLDto, Object]),
    __metadata("design:returntype", Promise)
], PDFController.prototype, "generatePDFFromURL", null);
__decorate([
    (0, common_1.Get)('health'),
    (0, swagger_1.ApiOperation)({
        summary: 'PDF service health check',
        description: 'Check if the PDF generation service is healthy and browser is connected'
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Service health status',
        schema: {
            type: 'object',
            properties: {
                status: { type: 'string', enum: ['healthy', 'unhealthy'] },
                browserConnected: { type: 'boolean' },
                timestamp: { type: 'string', format: 'date-time' }
            }
        }
    }),
    openapi.ApiResponse({ status: 200 }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PDFController.prototype, "healthCheck", null);
exports.PDFController = PDFController = __decorate([
    (0, swagger_1.ApiTags)('PDF Generation'),
    (0, common_1.Controller)('pdf'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [pdf_generator_service_1.PDFGeneratorService,
        error_handler_service_1.ErrorHandlerService])
], PDFController);
