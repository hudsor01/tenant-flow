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
import { IncomeStatementService } from './income-statement.service'

interface AuthenticatedRequest extends Request {
	user?: {
		id: string
		email: string
	}
}

@Controller('financials/income-statement')
@UseGuards(JwtAuthGuard)
export class IncomeStatementController {
	constructor(
		private readonly incomeStatementService: IncomeStatementService
	) {}

	@Get()
	async getIncomeStatement(
		@Req() req: AuthenticatedRequest,
		@Query('startDate') startDate?: string,
		@Query('endDate') endDate?: string
	) {
		const userId = req.user?.id

		if (!userId) {
			throw new BadRequestException('User ID is required')
		}

		// Default to current month if no dates provided
		const now = new Date()
		const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1)
			.toISOString()
			.split('T')[0] as string
		const defaultEndDate = now.toISOString().split('T')[0] as string

		const finalStartDate = startDate || defaultStartDate
		const finalEndDate = endDate || defaultEndDate

		// Validate date format
		if (
			!/^\d{4}-\d{2}-\d{2}$/.test(finalStartDate) ||
			!/^\d{4}-\d{2}-\d{2}$/.test(finalEndDate)
		) {
			throw new BadRequestException(
				'Invalid date format. Use YYYY-MM-DD format'
			)
		}

		const data = await this.incomeStatementService.generateIncomeStatement(
			userId,
			finalStartDate,
			finalEndDate
		)

		return {
			success: true,
			data
		}
	}
}
