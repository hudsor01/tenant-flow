import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SecurityUtils } from './security.utils'
import { SecurityMonitorService } from './security-monitor.service'
import { SRIManager } from './sri-manager'

@Global()
@Module({
    imports: [ConfigModule],
    providers: [SecurityUtils, SecurityMonitorService, SRIManager],
    exports: [SecurityUtils, SecurityMonitorService, SRIManager]
})
export class SecurityModule {}