import { Module } from '@nestjs/common'
import { DocumentsService } from './documents.service'
import { SupabaseModule } from '../database/supabase.module'

@Module({
	imports: [SupabaseModule],
	providers: [DocumentsService],
	exports: [DocumentsService]
})
export class DocumentsModule {}
