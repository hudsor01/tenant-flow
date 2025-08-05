import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SecurityUtils } from './security.utils'
import { SecurityMonitorService } from './security-monitor.service'
import { SRIManager } from './sri-manager'
import { FastifyHooksService } from '../hooks/fastify-hooks.service'
import { SecurityAuditService } from './audit.service'
import { FairHousingService } from './fair-housing.service'
import { EncryptionService } from './encryption.service'
import { PrivacyService } from './privacy.service'
import { ComplianceMonitorService } from './compliance-monitor.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Global()
@Module({
    imports: [ConfigModule, PrismaModule],
    providers: [
        SecurityUtils, 
        SecurityMonitorService, 
        SRIManager,
        FastifyHooksService,
        SecurityAuditService,
        FairHousingService,
        EncryptionService,
        PrivacyService,
        ComplianceMonitorService
    ],
    exports: [
        SecurityUtils, 
        SecurityMonitorService, 
        SRIManager,
        FastifyHooksService,
        SecurityAuditService,
        FairHousingService,
        EncryptionService,
        PrivacyService,
        ComplianceMonitorService
    ]
})
export class SecurityModule {}