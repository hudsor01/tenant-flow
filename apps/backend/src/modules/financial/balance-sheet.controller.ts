import {
	BadRequestException,
	Controller,
	Get,
	Query,
	Req,
	UseGuards
} from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard } from '../../shared/auth/jwt-auth.guard'
import { BalanceSheetService } from './balance-sheet.service'

interface AuthenticatedRequest extends Request {
	user?: {
		id: string
		email: string
	}
}

@Controller('financials/balance-sheet')
@UseGuards(JwtAuthGuard)
export class BalanceSheetController {
	constructor(private readonly balanceSheetService: BalanceSheetService) {}

	@Get()
	async getBalanceSheet(
		@Req() req: AuthenticatedRequest,
		@Query('asOfDate') asOfDate?: string
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User ID is required')
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
			userId,
			finalDate
		)

		return {
			success: true,
			data
		}
	}
}
