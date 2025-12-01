import {
	BadRequestException,
	Controller,
	Get,
	Query,
	UnauthorizedException
} from '@nestjs/common'
import { JwtToken } from '../../shared/decorators/jwt-token.decorator'
import type { CashFlowService, CashFlowData } from './cash-flow.service'

@Controller('financials/cash-flow')
export class CashFlowController {
	constructor(private readonly cashFlowService: CashFlowService) {}

	@Get()
	async getCashFlowStatement(
		@JwtToken() token: string,
		@Query('start_date') start_date?: string,
		@Query('end_date') end_date?: string
	): Promise<{ success: boolean; data: CashFlowData }> {
		if (!token) {
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
			finalStartDate,
			finalEndDate
		)

		return {
			success: true,
			data
		}
	}
}
