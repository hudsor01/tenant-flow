import { Module } from '@nestjs/common'
import { PDFController } from './pdf.controller'
import { PDFGeneratorService } from './pdf-generator.service'
import { LeasePDFService } from './lease-pdf.service'

/**
 * PDF module for generating PDF documents
 * Provides services for lease PDF generation and other document types
 */
@Module({
	controllers: [PDFController],
	providers: [PDFGeneratorService, LeasePDFService],
	exports: [PDFGeneratorService, LeasePDFService]
})
export class PDFModule {}