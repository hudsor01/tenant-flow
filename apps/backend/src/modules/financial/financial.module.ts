/**
 * Financial Module - Ultra-Native NestJS Pattern
 *
 * NO ABSTRACTIONS: Direct service registration
 * KISS: Simple module configuration
 * DRY: Reuse SupabaseService from @Global() SupabaseModule (no need to import or provide)
 */

import { Module } from '@nestjs/common'
import { PropertiesModule } from '../properties/properties.module'
import { BalanceSheetController } from './balance-sheet.controller'
import { BalanceSheetService } from './balance-sheet.service'
import { CashFlowController } from './cash-flow.controller'
import { CashFlowService } from './cash-flow.service'
import { IncomeStatementController } from './income-statement.controller'
import { IncomeStatementService } from './income-statement.service'
import { TaxDocumentsController } from './tax-documents.controller'
import { TaxDocumentsService } from './tax-documents.service'
import { FinancialService } from './financial.service'
import { FinancialExpenseService } from './financial-expense.service'
import { FinancialRevenueService } from './financial-revenue.service'
import { FinancialAnalyticsPublicController } from './financial-analytics.controller'
import { FinancialOverviewController } from './financial-overview.controller'

@Module({
	imports: [PropertiesModule],
	controllers: [
		FinancialOverviewController,
		IncomeStatementController,
		CashFlowController,
		BalanceSheetController,
		TaxDocumentsController,
		FinancialAnalyticsPublicController
	],
	providers: [
		FinancialExpenseService,
		FinancialRevenueService,
		FinancialService,
		IncomeStatementService,
		CashFlowService,
		BalanceSheetService,
		TaxDocumentsService
	],
	exports: [
		FinancialExpenseService,
		FinancialRevenueService,
		FinancialService,
		IncomeStatementService,
		CashFlowService,
		BalanceSheetService,
		TaxDocumentsService
	]
})
export class FinancialModule {}
