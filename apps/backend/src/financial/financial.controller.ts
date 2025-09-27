/**
 * ULTRA-NATIVE CONTROLLER - Financial endpoints
 * Direct implementation without abstractions
 */

import {
	Controller,
	Get,
	Logger,
	Query,
	DefaultValuePipe
} from '@nestjs/common'
import type { ControllerApiResponse } from '@repo/shared'

@Controller('financial')
export class FinancialController {
	private readonly logger = new Logger(FinancialController.name)

	constructor() {}

	@Get('chart-data')
	async getChartData(
		@Query('range', new DefaultValuePipe('6m')) range: string
	): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				action: 'getChartData',
				range
			},
			'Getting financial chart data'
		)

		// Generate mock data based on range
		const months = range === '1y' ? 12 : 6
		const currentDate = new Date()
		const chartData = []

		for (let i = months - 1; i >= 0; i--) {
			const date = new Date(currentDate)
			date.setMonth(date.getMonth() - i)

			// Generate realistic looking data
			const baseRevenue = 50000 + Math.random() * 20000
			const baseExpenses = 30000 + Math.random() * 10000

			chartData.push({
				date: date.toISOString().slice(0, 7), // YYYY-MM format
				revenue: Math.round(baseRevenue),
				expenses: Math.round(baseExpenses),
				profit: Math.round(baseRevenue - baseExpenses)
			})
		}

		return {
			success: true,
			data: chartData,
			message: 'Financial chart data retrieved successfully',
			timestamp: new Date()
		}
	}
}