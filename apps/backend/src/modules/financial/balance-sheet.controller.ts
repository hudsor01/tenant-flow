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
import { BalanceSheetService } from './balance-sheet.service'

@ApiTags('Financials')
@ApiBearerAuth('supabase-auth')
@Controller('financials/balance-sheet')
@UseGuards(JwtAuthGuard)
export class BalanceSheetController {
	constructor(private readonly balanceSheetService: BalanceSheetService) {}

	@ApiOperation({ summary: 'Get balance sheet', description: 'Generate balance sheet report as of a specific date' })
	@ApiQuery({ name: 'asOfDate', required: false, description: 'Date for balance sheet (YYYY-MM-DD format, defaults to today)' })
	@ApiResponse({ status: 200, description: 'Balance sheet generated successfully' })
	@ApiResponse({ status: 400, description: 'Invalid date format' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@Get()
	async getBalanceSheet(
		@Request() req: AuthenticatedRequest,
		@Query('asOfDate') asOfDate?: string
	) {
		const token = req.headers.authorization?.replace('Bearer ', '')
		if (!token || !req.user?.id) {
			throw new UnauthorizedException('Authentication token is required')
		}

		// Default to today if no date provided
		const defaultDate = new Date().toISOString().split('T')[0] as string
		const finalDate = asOfDate || defaultDate

		// Validate date format
		if (!/^\d{4}-\d{2}-\d{2}$/.test(finalDate)) {
			throw new BadRequestException(
				'Invalid date format. Use YYYY-MM-DD format'
			)
		}

		const data = await this.balanceSheetService.generateBalanceSheet(
			token,
			req.user.id,
			finalDate
		)

		return {
			success: true,
			data
		}
	}
}
