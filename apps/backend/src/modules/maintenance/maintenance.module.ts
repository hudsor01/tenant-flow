import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { AnalyticsModule } from '../analytics/analytics.module'
import { MaintenanceAnalyticsController } from './analytics.controller'
import { MaintenanceController } from './maintenance.controller'
import { MaintenanceService } from './maintenance.service'
import { MaintenanceReportingService } from './maintenance-reporting.service'
import { MaintenanceWorkflowService } from './maintenance-workflow.service'
import { MaintenanceAssignmentService } from './maintenance-assignment.service'
import { MaintenanceStatusService } from './maintenance-status.service'
import { MaintenanceExpenseService } from './maintenance-expense.service'

/**
 * Maintenance module
 *
 * Decomposed services (Jan 2026):
 * - MaintenanceService: Core CRUD operations
 * - MaintenanceExpenseService: Expense management
 * - MaintenanceWorkflowService: Status transitions
 * - MaintenanceAssignmentService: Assignment logic
 * - MaintenanceStatusService: Status updates
 * - MaintenanceReportingService: Stats and reporting
 */
@Module({
	imports: [SupabaseModule, AnalyticsModule],
	controllers: [MaintenanceController, MaintenanceAnalyticsController],
	providers: [
		MaintenanceService,
		MaintenanceReportingService,
		MaintenanceWorkflowService,
		MaintenanceAssignmentService,
		MaintenanceStatusService,
		MaintenanceExpenseService
	],
	exports: [
		MaintenanceService,
		MaintenanceReportingService,
		MaintenanceWorkflowService,
		MaintenanceAssignmentService,
		MaintenanceStatusService,
		MaintenanceExpenseService
	]
})
export class MaintenanceModule {}
