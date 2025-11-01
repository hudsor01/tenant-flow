import { Module } from '@nestjs/common'
import { TenantPortalController } from './tenant-portal.controller'
import { SupabaseService } from '../../database/supabase.service'

@Module({
	controllers: [TenantPortalController],
	providers: [SupabaseService]
})
export class TenantPortalModule {}
