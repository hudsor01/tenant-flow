import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SecurityUtils } from './security.utils'
import { SecurityMonitorService } from './security-monitor.service'
import { SRIManager } from './sri-manager'
import { FastifyHooksService } from '../hooks/fastify-hooks.service'

@Global()
@Module({
    imports: [ConfigModule],
    providers: [
        SecurityUtils, 
        SecurityMonitorService, 
        SRIManager,
        FastifyHooksService
    ],
    exports: [
        SecurityUtils, 
        SecurityMonitorService, 
        SRIManager,
        FastifyHooksService
    ]
})
export class SecurityModule {}