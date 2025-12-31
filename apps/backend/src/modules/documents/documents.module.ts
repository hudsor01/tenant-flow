import { Module } from '@nestjs/common'
import { CompressionService } from './compression.service'
import { DocumentTemplateStorageService } from './document-template-storage.service'

@Module({
	providers: [CompressionService, DocumentTemplateStorageService],
	exports: [CompressionService, DocumentTemplateStorageService]
})
export class DocumentsModule {}
