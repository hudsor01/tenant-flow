import { Module } from '@nestjs/common'
import { TenantPortalController } from './tenant-portal.controller'
import { SupabaseModule } from '../../database/supabase.module'

@Module({
	imports: [SupabaseModule],
	controllers: [TenantPortalController]
})
export class TenantPortalModule {}
