import { Module } from '@nestjs/common'
import { SecurityMonitorService } from './security-monitor.service'
import { SecurityController } from './security.controller'

@Module({
	controllers: [SecurityController],
	providers: [SecurityMonitorService],
	exports: [SecurityMonitorService]
})
export class SecurityModule {}
