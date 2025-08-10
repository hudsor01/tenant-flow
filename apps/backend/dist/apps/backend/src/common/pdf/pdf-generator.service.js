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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var PDFGeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PDFGeneratorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const puppeteer_1 = __importDefault(require("puppeteer"));
const error_handler_service_1 = require("../errors/error-handler.service");
let PDFGeneratorService = PDFGeneratorService_1 = class PDFGeneratorService {
    constructor(configService, errorHandler) {
        this.configService = configService;
        this.errorHandler = errorHandler;
        this.logger = new common_1.Logger(PDFGeneratorService_1.name);
        this.browser = null;
        this.isProduction = this.configService.get('NODE_ENV') === 'production';
    }
    async getBrowser() {
        if (!this.browser) {
            const launchOptions = {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--single-process',
                    '--disable-gpu'
                ],
                ...(this.isProduction && {
                    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser'
                })
            };
            this.browser = await puppeteer_1.default.launch(launchOptions);
            this.logger.log('PDF generator browser initialized', {
                version: await this.browser.version(),
                isProduction: this.isProduction
            });
            this.browser.on('disconnected', () => {
                this.logger.warn('PDF generator browser disconnected');
                this.browser = null;
            });
        }
        return this.browser;
    }
    async generatePDF(options) {
        const startTime = Date.now();
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();
            await page.setViewport({
                width: 1200,
                height: 800,
                deviceScaleFactor: 1
            });
            const fullHtml = this.buildCompleteHTML(options.html, options.css);
            await page.setContent(fullHtml, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            const pdfBuffer = await page.pdf({
                format: options.format || 'Letter',
                printBackground: options.printBackground ?? true,
                margin: {
                    top: '0.75in',
                    right: '0.75in',
                    bottom: '0.75in',
                    left: '0.75in',
                    ...options.margin
                },
                scale: options.scale || 1,
                preferCSSPageSize: true,
                displayHeaderFooter: !!(options.headerTemplate || options.footerTemplate || options.includePageNumbers),
                headerTemplate: options.headerTemplate || '',
                footerTemplate: options.footerTemplate || (options.includePageNumbers ?
                    `<div style="font-size: 10px; text-align: center; width: 100%;">
             <span class="pageNumber"></span> of <span class="totalPages"></span>
           </div>` :
                    '')
            });
            await page.close();
            const generationTime = Date.now() - startTime;
            const filename = `${options.filename}.pdf`;
            this.logger.log('PDF generated successfully', {
                filename,
                size: pdfBuffer.length,
                generationTime: `${generationTime}ms`
            });
            return {
                buffer: Buffer.from(pdfBuffer),
                filename,
                size: pdfBuffer.length,
                mimeType: 'application/pdf'
            };
        }
        catch (error) {
            const generationTime = Date.now() - startTime;
            this.logger.error('PDF generation failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                filename: options.filename,
                generationTime: `${generationTime}ms`
            });
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'generatePDF',
                resource: 'pdf',
                metadata: { filename: options.filename }
            });
        }
    }
    async generatePDFFromURL(url, filename, pdfOptions = {}) {
        const startTime = Date.now();
        try {
            const browser = await this.getBrowser();
            const page = await browser.newPage();
            await page.setViewport({
                width: 1200,
                height: 800,
                deviceScaleFactor: 1
            });
            await page.goto(url, {
                waitUntil: 'networkidle0',
                timeout: 30000
            });
            const pdfBuffer = await page.pdf({
                format: pdfOptions.format || 'Letter',
                printBackground: pdfOptions.printBackground ?? true,
                margin: {
                    top: '0.75in',
                    right: '0.75in',
                    bottom: '0.75in',
                    left: '0.75in',
                    ...pdfOptions.margin
                },
                scale: pdfOptions.scale || 1,
                preferCSSPageSize: true,
                displayHeaderFooter: !!(pdfOptions.headerTemplate || pdfOptions.footerTemplate || pdfOptions.includePageNumbers),
                headerTemplate: pdfOptions.headerTemplate || '',
                footerTemplate: pdfOptions.footerTemplate || (pdfOptions.includePageNumbers ?
                    `<div style="font-size: 10px; text-align: center; width: 100%;">
             <span class="pageNumber"></span> of <span class="totalPages"></span>
           </div>` :
                    '')
            });
            await page.close();
            const generationTime = Date.now() - startTime;
            const pdfFilename = `${filename}.pdf`;
            this.logger.log('PDF generated from URL successfully', {
                url,
                filename: pdfFilename,
                size: pdfBuffer.length,
                generationTime: `${generationTime}ms`
            });
            return {
                buffer: Buffer.from(pdfBuffer),
                filename: pdfFilename,
                size: pdfBuffer.length,
                mimeType: 'application/pdf'
            };
        }
        catch (error) {
            const generationTime = Date.now() - startTime;
            this.logger.error('PDF generation from URL failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                url,
                filename,
                generationTime: `${generationTime}ms`
            });
            throw this.errorHandler.handleErrorEnhanced(error, {
                operation: 'generatePDFFromURL',
                resource: 'pdf',
                metadata: { url, filename }
            });
        }
    }
    buildCompleteHTML(htmlContent, css) {
        const defaultCSS = `
      @page {
        margin: 0.75in;
      }
      body {
        font-family: 'Times New Roman', Times, serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #333;
        margin: 0;
        padding: 0;
      }
      h1, h2, h3, h4, h5, h6 {
        font-weight: bold;
        margin: 1em 0 0.5em 0;
      }
      h1 { font-size: 16pt; text-align: center; }
      h2 { font-size: 14pt; }
      h3 { font-size: 12pt; }
      p { margin: 0.5em 0; }
      .page-break { page-break-before: always; }
      .no-break { page-break-inside: avoid; }
      .text-center { text-align: center; }
      .text-bold { font-weight: bold; }
      .signature-line {
        border-bottom: 1px solid #333;
        width: 200px;
        margin: 20px 0 5px 0;
      }
      .signature-block {
        margin: 30px 0;
        page-break-inside: avoid;
      }
    `;
        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Document</title>
    <style>
        ${defaultCSS}
        ${css || ''}
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>
    `;
    }
    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.logger.log('PDF generator browser closed');
        }
    }
    async healthCheck() {
        try {
            const browser = await this.getBrowser();
            const isConnected = browser.isConnected();
            return {
                status: isConnected ? 'healthy' : 'unhealthy',
                browserConnected: isConnected
            };
        }
        catch (error) {
            this.logger.error('PDF service health check failed', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return {
                status: 'unhealthy',
                browserConnected: false
            };
        }
    }
    async onModuleDestroy() {
        await this.closeBrowser();
    }
};
exports.PDFGeneratorService = PDFGeneratorService;
exports.PDFGeneratorService = PDFGeneratorService = PDFGeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        error_handler_service_1.ErrorHandlerService])
], PDFGeneratorService);
