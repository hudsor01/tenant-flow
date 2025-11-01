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
import { BalanceSheetService } from './balance-sheet.service'

@Controller('financials/balance-sheet')
@UseGuards(JwtAuthGuard)
export class BalanceSheetController {
	constructor(private readonly balanceSheetService: BalanceSheetService) {}

	@Get()
	async getBalanceSheet(
		@JwtToken() token: string,
		@Query('asOfDate') asOfDate?: string
	) {
		if (!token) {
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
			finalDate
		)

		return {
			success: true,
			data
		}
	}
}
