import { Module } from '@nestjs/common'
import { SupabaseService } from './supabase.service'
import { TypeSafeConfigModule } from '../config/config.module'

@Module({
	imports: [TypeSafeConfigModule],
	providers: [SupabaseService],
	exports: [SupabaseService]
})
export class SupabaseModule {}
