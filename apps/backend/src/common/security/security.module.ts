import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SecurityUtils } from './security.utils'
import { SimpleSecurityService } from './simple-security.service'
import { FastifyHooksService } from '../hooks/fastify-hooks.service'
import { PrismaModule } from '../../prisma/prisma.module'
import { SecurityAuditService } from './audit.service'
import { SecurityMonitorService } from './security-monitor.service'
import { ComplianceMonitorService } from './compliance-monitor.service'
import { PrivacyService } from './privacy.service'
import { EncryptionService } from './encryption.service'
import { LoggerModule } from '../modules/logger.module'

@Global()
@Module({
    imports: [ConfigModule, PrismaModule, LoggerModule],
    providers: [
        SecurityUtils, // Keep for backward compatibility during transition
        SimpleSecurityService, // New simplified service
        FastifyHooksService,
        SecurityAuditService,
        SecurityMonitorService,
        ComplianceMonitorService,
        PrivacyService,
        EncryptionService,
    ],
    exports: [
        SecurityUtils, 
        SimpleSecurityService,
        FastifyHooksService,
        SecurityAuditService,
        SecurityMonitorService,
        ComplianceMonitorService,
        PrivacyService,
        EncryptionService,
    ]
})
export class SecurityModule {}