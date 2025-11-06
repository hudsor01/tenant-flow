import { Module } from '@nestjs/common'
import { SupabaseModule } from '../database/supabase.module'
import { SecurityService } from './security.service'
import { SecurityMetricsService } from './security-metrics.service'
import { SecurityMonitorService } from './security-monitor.service'
import { SecurityController } from './security.controller'

@Module({
	imports: [SupabaseModule],
	controllers: [SecurityController],
	providers: [SecurityService, SecurityMonitorService, SecurityMetricsService],
	exports: [SecurityService, SecurityMonitorService, SecurityMetricsService]
})
export class SecurityModule {}
