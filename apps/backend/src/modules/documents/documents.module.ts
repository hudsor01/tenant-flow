import { Module } from '@nestjs/common'
import { CompressionService } from './compression.service'
import { StorageService } from '../../database/storage.service'
import { SupabaseService } from '../../database/supabase.service'

@Module({
	providers: [CompressionService, StorageService, SupabaseService],
	exports: [CompressionService]
})
export class DocumentsModule {}
