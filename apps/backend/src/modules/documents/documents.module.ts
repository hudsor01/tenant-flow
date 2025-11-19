import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { CompressionService } from './compression.service'

@Module({
	imports: [SupabaseModule],
	providers: [CompressionService],
	exports: [CompressionService]
})
export class DocumentsModule {}
