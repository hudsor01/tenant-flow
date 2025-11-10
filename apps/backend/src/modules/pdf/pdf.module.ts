import { Module } from '@nestjs/common'
import { PDFGeneratorService } from './pdf-generator.service'
import { ReactLeasePDFService } from './react-lease-pdf.service'
import { LeaseGenerationController } from './lease-generation.controller'
import { SupabaseModule } from '../../database/supabase.module'

/**
 * PDF module for generating PDF documents
 * Provides services for lease PDF generation and other document types
 */
@Module({
	imports: [SupabaseModule],
	controllers: [LeaseGenerationController],
	providers: [PDFGeneratorService, ReactLeasePDFService],
	exports: [PDFGeneratorService, ReactLeasePDFService]
})
export class PDFModule {}
