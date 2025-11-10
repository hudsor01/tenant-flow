import { Module } from '@nestjs/common'
import { LeasePDFService } from './lease-pdf.service'
import { PDFGeneratorService } from './pdf-generator.service'
import { TexasLeasePDFService } from './texas-lease-pdf.service'
import { PDFController } from './pdf.controller'
import { LeaseGenerationController } from './lease-generation.controller'
import { SupabaseModule } from '../../database/supabase.module'

/**
 * PDF module for generating PDF documents
 * Provides services for lease PDF generation and other document types
 */
@Module({
	imports: [SupabaseModule],
	controllers: [PDFController, LeaseGenerationController],
	providers: [PDFGeneratorService, LeasePDFService, TexasLeasePDFService],
	exports: [PDFGeneratorService, LeasePDFService, TexasLeasePDFService]
})
export class PDFModule {}
