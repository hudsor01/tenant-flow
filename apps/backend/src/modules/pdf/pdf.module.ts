import { Module } from '@nestjs/common'
import { PDFGeneratorService } from './pdf-generator.service'
import { ReactLeasePDFService } from './react-lease-pdf.service'
import { LeasePdfMapperService } from './lease-pdf-mapper.service'
import { LeasePdfGeneratorService } from './lease-pdf-generator.service'
import { PdfStorageService } from './pdf-storage.service'
import { StateValidationService } from './state-validation.service'
import { TemplateCacheService } from './template-cache.service'
import { PdfTemplateRendererService } from './pdf-template-renderer.service'
import { LeaseGenerationController } from './lease-generation.controller'
import { DocumentTemplateController } from './document-template.controller'
import { SupabaseModule } from '../../database/supabase.module'
import { CacheConfigurationModule } from '../../cache/cache.module'
import { SharedModule } from '../../shared/shared.module'
import { DocumentsModule } from '../documents/documents.module'

/**
 * PDF module for generating PDF documents
 * Provides services for lease PDF generation and other document types
 */
@Module({
	imports: [
		SupabaseModule,
		CacheConfigurationModule,
		SharedModule,
		DocumentsModule
	],
	controllers: [LeaseGenerationController, DocumentTemplateController],
	providers: [
		PDFGeneratorService,
		ReactLeasePDFService,
		LeasePdfMapperService,
		LeasePdfGeneratorService,
		PdfStorageService,
		StateValidationService,
		TemplateCacheService,
		PdfTemplateRendererService
	],
	exports: [
		PDFGeneratorService,
		ReactLeasePDFService,
		LeasePdfMapperService,
		LeasePdfGeneratorService,
		PdfStorageService,
		PdfTemplateRendererService
	]
})
export class PDFModule {}
