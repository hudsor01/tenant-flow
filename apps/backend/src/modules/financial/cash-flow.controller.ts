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
import { CashFlowService } from './cash-flow.service'
import type { CashFlowData } from './cash-flow.service'

@ApiTags('Financials')
@ApiBearerAuth('supabase-auth')
@Controller('financials/cash-flow')
@UseGuards(JwtAuthGuard)
export class CashFlowController {
	constructor(private readonly cashFlowService: CashFlowService) {}

	@ApiOperation({ summary: 'Get cash flow statement', description: 'Generate cash flow statement for a date range' })
	@ApiQuery({ name: 'start_date', required: false, description: 'Start date (YYYY-MM-DD format, defaults to first of current month)' })
	@ApiQuery({ name: 'end_date', required: false, description: 'End date (YYYY-MM-DD format, defaults to today)' })
	@ApiResponse({ status: 200, description: 'Cash flow statement generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid date format' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async getCashFlowStatement(
		@Request() req: AuthenticatedRequest,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	): Promise<{ success: boolean; data: CashFlowData }> {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token || !req.user?.id) {
			throw new UnauthorizedException('Authentication token is required')
		}

		// Default to current month if no dates provided
		const now = new Date()
		const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
			.toISOString()
			.split('T')[0] as string
		const defaultEndDate = now.toISOString().split('T')[0] as string

		const finalStartDate = start_date || defaultStartDate
		const finalEndDate = end_date || defaultEndDate

		// Validate date format
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(finalStartDate) ||
			!/^\d{4}-\d{2}-\d{2}$/.test(finalEndDate)
		) {
			throw new BadRequestException(
				'Invalid date format. Use YYYY-MM-DD format'
			)
		}

		const data = await this.cashFlowService.generateCashFlowStatement(
			token,
			req.user.id,
			finalStartDate,
			finalEndDate
		)

		return {
			success: true,
			data
		}
	}
}
