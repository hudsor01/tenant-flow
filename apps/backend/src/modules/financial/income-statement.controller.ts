import {
	BadRequestException,
	Controller,
	Get,
	Query,
	UnauthorizedException,
	UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import { IncomeStatementService } from './income-statement.service'

@Controller('financials/income-statement')
@UseGuards(JwtAuthGuard)
export class IncomeStatementController {
	constructor(
		private readonly incomeStatementService: IncomeStatementService
	) {}

	@Get()
	async getIncomeStatement(
		@JwtToken() token: string,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	) {
		if (!token) {
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
			finalstart_date,
			finalEndDate
		)

		return {
			success: true,
			data
		}
	}
}
