import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PDFGeneratorService } from './pdf-generator.service'
import { PDFController } from './pdf.controller'
import { ErrorHandlerService } from '../errors/error-handler.service'

/**
 * PDF Module
 * 
 * Provides PDF generation services using Puppeteer
 * 
 * Features:
 * - HTML to PDF conversion
 * - URL to PDF conversion
 * - Production-ready with proper error handling
 * - Health check endpoints
 * - Memory management and browser lifecycle
 * 
 * References:
 * - https://docs.nestjs.com/modules
 * - https://pptr.dev/guides/pdf-generation
 */
@Module({
  imports: [ConfigModule],
  controllers: [PDFController],
  providers: [
    PDFGeneratorService,
    ErrorHandlerService
  ],
  exports: [PDFGeneratorService]
})
export class PDFModule {}