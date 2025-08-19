import { Module } from '@nestjs/common'
import { DocumentsService } from './documents.service'
import { DocumentsController } from './documents.controller'
import { SupabaseModule } from '../database/supabase.module'

@Module({
	imports: [SupabaseModule],
	controllers: [DocumentsController],
	providers: [DocumentsService],
	exports: [DocumentsService]
})
export class DocumentsModule {}
