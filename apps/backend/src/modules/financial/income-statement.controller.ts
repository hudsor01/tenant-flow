import {
	BadRequestException,
	Controller,
	Get,
	Query,
	Request,
	UnauthorizedException,
	UseGuards
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiOperation,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import type { AuthenticatedRequest } from '../../shared/types/express-request.types'
import { IncomeStatementService } from './income-statement.service'

@ApiTags('Financials')
@ApiBearerAuth('supabase-auth')
@Controller('financials/income-statement')
@UseGuards(JwtAuthGuard)
export class IncomeStatementController {
	constructor(
		private readonly incomeStatementService: IncomeStatementService
	) {}

	@ApiOperation({ summary: 'Get income statement', description: 'Generate income statement (P&L) for a date range' })
	@ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD format, defaults to first of current month)' })
	@ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD format, defaults to today)' })
	@ApiResponse({ status: 200, description: 'Income statement generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid date format' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async getIncomeStatement(
		@Request() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token || !req.user?.id) {
			throw new UnauthorizedException('Authentication token is required')
		}

		// Default to current month if no dates provided
		const now = new Date()
		const defaultstart_date = new Date(now.getFullYear(), now.getMonth(), 1)
			.toISOString()
			.split('T')[0] as string
		const defaultEndDate = now.toISOString().split('T')[0] as string

		const finalstart_date = start_date || defaultstart_date
		const finalEndDate = end_date || defaultEndDate

		// Validate date format
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(finalstart_date) ||
			!/^\d{4}-\d{2}-\d{2}$/.test(finalEndDate)
		) {
			throw new BadRequestException(
				'Invalid date format. Use YYYY-MM-DD format'
			)
		}

		const data = await this.incomeStatementService.generateIncomeStatement(
			token,
			req.user.id,
			finalstart_date,
			finalEndDate
		)

		return {
			success: true,
			data
		}
	}
}
