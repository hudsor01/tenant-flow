import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SupabaseService } from './supabase.service'
import { MultiTenantSupabaseService } from './multi-tenant-supabase.service'

/**
 * Global module providing Supabase database services
 * Replaces the previous PrismaModule
 */
@Global()
@Module({
	imports: [ConfigModule],
	providers: [SupabaseService, MultiTenantSupabaseService],
	exports: [SupabaseService, MultiTenantSupabaseService]
})
export class SupabaseModule {}
