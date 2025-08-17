import { Module } from '@nestjs/common'
import { DocumentsController } from './documents.controller'
import { DocumentsService } from './documents.service'
import { DocumentSupabaseRepository } from './document-supabase.repository'
import { SupabaseModule } from '../common/supabase/supabase.module'
import { ErrorModule } from '../common/errors/error.module'
import { SecurityModule } from '../common/security/security.module'

@Module({
	imports: [SupabaseModule, ErrorModule, SecurityModule],
	controllers: [DocumentsController],
	providers: [DocumentsService, DocumentSupabaseRepository],
	exports: [DocumentsService, DocumentSupabaseRepository]
})
export class DocumentsModule {}
