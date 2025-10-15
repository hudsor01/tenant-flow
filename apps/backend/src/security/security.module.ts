import { Module } from '@nestjs/common'
import { SupabaseModule } from '../database/supabase.module'
import { SecurityMetricsService } from './security-metrics.service'
import { SecurityMonitorService } from './security-monitor.service'
import { SecurityController } from './security.controller'

@Module({
	imports: [SupabaseModule],
	controllers: [SecurityController],
	providers: [SecurityMonitorService, SecurityMetricsService],
	exports: [SecurityMonitorService, SecurityMetricsService]
})
export class SecurityModule {}
