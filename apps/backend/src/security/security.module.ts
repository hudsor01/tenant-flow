import { Module } from '@nestjs/common'
import { RepositoriesModule } from '../repositories/repositories.module'
import { SecurityMonitorService } from './security-monitor.service'
import { SecurityController } from './security.controller'
import { SecurityMetricsService } from './security-metrics.service'

@Module({
	imports: [RepositoriesModule],
	controllers: [SecurityController],
	providers: [SecurityMonitorService, SecurityMetricsService],
	exports: [SecurityMonitorService, SecurityMetricsService]
})
export class SecurityModule {}
