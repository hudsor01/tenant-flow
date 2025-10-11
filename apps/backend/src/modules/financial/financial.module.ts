import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { SupabaseService } from '../../database/supabase.service'
import { RepositoriesModule } from '../../repositories/repositories.module'
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
	imports: [RepositoriesModule, SupabaseModule],
	controllers: [
		FinancialAnalyticsController,
		IncomeStatementController,
		CashFlowController,
		BalanceSheetController,
		TaxDocumentsController
	],
	providers: [
		SupabaseService,
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
