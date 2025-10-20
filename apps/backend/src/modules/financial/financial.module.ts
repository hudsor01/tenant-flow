/**
 * Financial Module - Ultra-Native NestJS Pattern
 *
 * NO ABSTRACTIONS: Direct service registration
 * KISS: Simple module configuration
 * DRY: Reuse SupabaseService from @Global() SupabaseModule (no need to import or provide)
 */

import { Module } from '@nestjs/common'
import { FinancialAnalyticsController } from './analytics.controller'
import { BalanceSheetController } from './balance-sheet.controller'
import { BalanceSheetService } from './balance-sheet.service'
import { CashFlowController } from './cash-flow.controller'
import { CashFlowService } from './cash-flow.service'
import { IncomeStatementController } from './income-statement.controller'
import { IncomeStatementService } from './income-statement.service'
import { TaxDocumentsController } from './tax-documents.controller'
import { TaxDocumentsService } from './tax-documents.service'

@Module({
	imports: [],
	controllers: [
		FinancialAnalyticsController,
		IncomeStatementController,
		CashFlowController,
		BalanceSheetController,
		TaxDocumentsController
	],
	providers: [
		IncomeStatementService,
		CashFlowService,
		BalanceSheetService,
		TaxDocumentsService
	],
	exports: [
		IncomeStatementService,
		CashFlowService,
		BalanceSheetService,
		TaxDocumentsService
	]
})
export class FinancialModule {}
