import { Module } from '@nestjs/common'
import { AdminUsersController } from './controllers/admin-users.controller'
import { AdminSystemController } from './controllers/admin-system.controller'
import { AdminService } from './services/admin.service'
import { SupabaseModule } from '../../database/supabase.module'
import { EmailModule } from '../email/email.module'
import { WebhooksModule } from '../billing/webhooks/webhooks.module'

/**
 * Admin Module
 *
 * Provides admin-only endpoints for:
 * - User management
 * - System health monitoring
 * - Application metrics and queue statistics
 * - Logs and audit trails
 *
 * All routes protected by @Roles('ADMIN') guard
 * Note: Bull Board dashboard configured in app.module.ts
 */
@Module({
	imports: [
		SupabaseModule,
		EmailModule,
		// Import WebhooksModule to get access to stripe-webhooks queue (exported via BullModule)
		WebhooksModule
	],
	controllers: [AdminUsersController, AdminSystemController],
	providers: [AdminService],
	exports: [AdminService]
})
export class AdminModule {}
