import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'
import { SupabaseModule } from '../database/supabase.module'

@Module({
	imports: [SupabaseModule],
	controllers: [HealthController]
})
export class HealthModule {}
