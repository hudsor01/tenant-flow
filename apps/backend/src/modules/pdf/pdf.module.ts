import { Module } from '@nestjs/common'
import { PDFGeneratorService } from './pdf-generator.service'
import { ReactLeasePDFService } from './react-lease-pdf.service'
import { LeasePdfMapperService } from './lease-pdf-mapper.service'
import { LeasePdfGeneratorService } from './lease-pdf-generator.service'
import { PdfStorageService } from './pdf-storage.service'
import { LeaseGenerationController } from './lease-generation.controller'
import { SupabaseModule } from '../../database/supabase.module'
import { CacheConfigurationModule } from '../../cache/cache.module'
import { SharedModule } from '../../shared/shared.module'

/**
 * PDF module for generating PDF documents
 * Provides services for lease PDF generation and other document types
 */
@Module({
	imports: [SupabaseModule, CacheConfigurationModule, SharedModule],
	controllers: [LeaseGenerationController],
	providers: [
		PDFGeneratorService,
		ReactLeasePDFService,
		LeasePdfMapperService,
		LeasePdfGeneratorService,
		PdfStorageService
	],
	exports: [
		PDFGeneratorService,
		ReactLeasePDFService,
		LeasePdfMapperService,
		LeasePdfGeneratorService,
		PdfStorageService
	]
})
export class PDFModule {}
