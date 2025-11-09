import { Module } from '@nestjs/common'
import { FinancialController } from './financial.controller'
import { DashboardModule } from '../../dashboard/dashboard.module'

/**
 * FinancialModule
 *
 * Owner financial analytics and insights
 * - Billing insights (Stripe Sync Engine)
 * - Revenue trends
 * - Financial health monitoring
 */
@Module({
	imports: [DashboardModule],
	controllers: [FinancialController]
})
export class FinancialModule {}
