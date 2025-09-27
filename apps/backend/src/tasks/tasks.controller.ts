/**
 * ULTRA-NATIVE CONTROLLER - DO NOT ADD ABSTRACTIONS
 * Direct implementation for tasks/upcoming endpoint
 */

import {
	Controller,
	Get,
	Logger,
	Query,
	DefaultValuePipe,
	ParseIntPipe
} from '@nestjs/common'
import type { ControllerApiResponse } from '@repo/shared'

@Controller('tasks')
export class TasksController {
	private readonly logger = new Logger(TasksController.name)

	constructor() {}

	@Get('upcoming')
	async getUpcomingTasks(
		@Query('days', new DefaultValuePipe(30), ParseIntPipe) days?: number
	): Promise<ControllerApiResponse> {
		this.logger?.log(
			{
				action: 'getUpcomingTasks',
				days
			},
			'Getting upcoming tasks'
		)

		// Return mock data for now - can be replaced with actual database calls
		const mockTasks = [
			{
				id: '1',
				title: 'Lease Renewal - Unit 101',
				description: 'Review and renew lease for tenant John Doe',
				type: 'lease',
				priority: 'high',
				dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
				completed: false
			},
			{
				id: '2',
				title: 'Maintenance Inspection',
				description: 'Quarterly HVAC inspection for Building A',
				type: 'maintenance',
				priority: 'medium',
				dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
				completed: false
			},
			{
				id: '3',
				title: 'Rent Collection',
				description: 'Process monthly rent payments',
				type: 'payment',
				priority: 'high',
				dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
				completed: false
			},
			{
				id: '4',
				title: 'Property Walkthrough',
				description: 'Monthly property inspection for Building B',
				type: 'inspection',
				priority: 'low',
				dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
				completed: false
			},
			{
				id: '5',
				title: 'Insurance Renewal',
				description: 'Review and renew property insurance',
				type: 'admin',
				priority: 'high',
				dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
				completed: true
			}
		]

		return {
			success: true,
			data: mockTasks,
			message: 'Upcoming tasks retrieved successfully',
			timestamp: new Date()
		}
	}
}