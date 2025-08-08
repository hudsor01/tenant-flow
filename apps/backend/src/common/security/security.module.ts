import { Module, Global } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { SecurityUtils } from './security.utils'
import { SimpleSecurityService } from './simple-security.service'
import { FastifyHooksService } from '../hooks/fastify-hooks.service'
import { PrismaModule } from '../../prisma/prisma.module'

@Global()
@Module({
    imports: [ConfigModule, PrismaModule],
    providers: [
        SecurityUtils, // Keep for backward compatibility during transition
        SimpleSecurityService, // New simplified service
        FastifyHooksService,
    ],
    exports: [
        SecurityUtils, 
        SimpleSecurityService,
        FastifyHooksService,
    ]
})
export class SecurityModule {}