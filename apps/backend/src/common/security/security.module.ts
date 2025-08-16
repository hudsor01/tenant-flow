import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeSafeConfigModule } from '../config/config.module'
import { TypeSafeConfigService } from '../config/config.service'
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
import { SecurityHeadersMiddleware } from '../middleware/security-headers.middleware'
import { SecurityController } from '../controllers/security.controller'
import { FileUploadSecurityService } from './file-upload-security.service'
import { FileUploadController } from '../controllers/file-upload.controller'
import { ApiKeyManagementService } from './api-key-management.service'
import { ApiKeyManagementController } from '../controllers/api-key-management.controller'
import { CorsSecurityService } from './cors-security.service'
import { CorsManagementController } from '../controllers/cors-management.controller'
import { RequestLimitsService } from './request-limits.service'
import { RequestLimitsController } from '../controllers/request-limits.controller'
import { RequestLimitsMiddleware } from '../middleware/request-limits.middleware'
import { CsrfTokenService } from './csrf-token.service'
import { CsrfTokenController } from '../controllers/csrf-token.controller'
import { SessionUtilsService } from '../utils/session-utils.service'
import { CsrfUtilsService } from '../utils/csrf-utils.service'
import { NetworkUtilsService } from '../utils/network-utils.service'
import { RequestUtilsService } from '../utils/request-utils.service'

@Global()
@Module({
	imports: [ConfigModule, TypeSafeConfigModule, PrismaModule, LoggerModule],
	controllers: [
		SecurityController,
		FileUploadController,
		ApiKeyManagementController,
		CorsManagementController,
		RequestLimitsController,
		CsrfTokenController
	],
	providers: [
		TypeSafeConfigService,
		SecurityUtils, // Keep for backward compatibility during transition
		SimpleSecurityService, // New simplified service
		FastifyHooksService,
		SecurityAuditService,
		SecurityMonitorService,
		ComplianceMonitorService,
		PrivacyService,
		EncryptionService,
		SecurityHeadersMiddleware,
		FileUploadSecurityService,
		ApiKeyManagementService,
		CorsSecurityService,
		RequestLimitsService,
		RequestLimitsMiddleware,
		CsrfTokenService,
		SessionUtilsService,
		CsrfUtilsService,
		NetworkUtilsService,
		RequestUtilsService
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
		SecurityHeadersMiddleware,
		FileUploadSecurityService,
		ApiKeyManagementService,
		CorsSecurityService,
		RequestLimitsService,
		RequestLimitsMiddleware,
		CsrfTokenService,
		SessionUtilsService,
		CsrfUtilsService,
		NetworkUtilsService,
		RequestUtilsService
	]
})
export class SecurityModule {}
