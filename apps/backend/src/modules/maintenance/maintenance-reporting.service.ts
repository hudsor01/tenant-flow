/**
 * Maintenance Reporting Service
 * Handles statistics, urgent, and overdue maintenance request queries
 * Extracted from MaintenanceService for SRP compliance
 */

import { BadRequestException, Injectable } from '@nestjs/common'
import type { MaintenanceStats } from '@repo/shared/types/stats'
import type { MaintenanceRequest } from '@repo/shared/types/core'
import type { Database } from '@repo/shared/types/supabase'
import { SupabaseService } from '../../database/supabase.service'
import { AppLogger } from '../../logger/app-logger.service'

@Injectable()
export class MaintenanceReportingService {
	constructor(
		private readonly supabase: SupabaseService,
		private readonly logger: AppLogger
	) {}

	/**
	 * Get maintenance statistics
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async getStats(
		token: string
	): Promise<
		MaintenanceStats & { totalCost: number; avgResponseTimeHours: number }
	> {
		if (!token) {
			this.logger.warn('Maintenance stats requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		this.logger.log('Getting maintenance stats via RLS-protected query')

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('maintenance_requests')
			.select('status, priority, estimated_cost, created_at, completed_at')

		if (error) {
			this.logger.error('Failed to get maintenance stats from Supabase', {
				error: error.message
			})
			throw new BadRequestException('Failed to get maintenance statistics')
		}

		type MaintenanceRow =
			Database['public']['Tables']['maintenance_requests']['Row']
		type RequestPick = Pick<
			MaintenanceRow,
			'created_at' | 'completed_at' | 'estimated_cost' | 'priority' | 'status'
		>
		const requests = (data ?? []) as RequestPick[]
		const now = new Date()
		const todayStart = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		)

		const completedRequests = requests.filter(
			(r): r is RequestPick & { completed_at: string; created_at: string } =>
				!!r.completed_at && !!r.created_at
		)
		const avgResolutionTime =
			completedRequests.length > 0
				? completedRequests.reduce((sum: number, r) => {
						const created = new Date(r.created_at).getTime()
						const completed = new Date(r.completed_at).getTime()
						return sum + (completed - created) / (1000 * 60 * 60)
					}, 0) / completedRequests.length
				: 0

		const stats: MaintenanceStats & {
			totalCost: number
			avgResponseTimeHours: number
		} = {
			total: requests.length,
			open: requests.filter(r => r.status === 'open').length,
			inProgress: requests.filter(r => r.status === 'in_progress').length,
			completed: requests.filter(r => r.status === 'completed').length,
			completedToday: requests.filter(
				r =>
					r.status === 'completed' &&
					r.completed_at &&
					new Date(r.completed_at) >= todayStart
			).length,
			avgResolutionTime,
			byPriority: {
				low: requests.filter(r => r.priority === 'low').length,
				medium: requests.filter(r => r.priority === 'normal').length,
				high: requests.filter(r => r.priority === 'high').length,
				emergency: requests.filter(r => r.priority === 'urgent').length
			},
			totalCost: requests.reduce(
				(sum: number, r) => sum + (r.estimated_cost || 0),
				0
			),
			avgResponseTimeHours: avgResolutionTime
		}

		return stats
	}

	/**
	 * Get urgent maintenance requests (HIGH and URGENT priority)
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async getUrgent(token: string): Promise<MaintenanceRequest[]> {
		if (!token) {
			this.logger.warn('Urgent maintenance requests requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		this.logger.log(
			'Getting urgent maintenance requests via RLS-protected query'
		)

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('maintenance_requests')
			.select('id, unit_id, owner_user_id, tenant_id, title, description, status, priority, assigned_to, scheduled_date, completed_at, estimated_cost, actual_cost, requested_by, inspection_date, inspection_findings, inspector_id, created_at, updated_at')
			.in('priority', ['high', 'urgent'])
			.neq('status', 'completed')
			.order('priority', { ascending: false })
			.order('created_at', { ascending: true })

		if (error) {
			this.logger.error(
				'Failed to get urgent maintenance requests from Supabase',
				{
					error: error.message
				}
			)
			throw new BadRequestException('Failed to get urgent maintenance requests')
		}

		return data as MaintenanceRequest[]
	}

	/**
	 * Get overdue maintenance requests
	 * RLS COMPLIANT: Uses getUserClient(token) - RLS automatically filters to user's maintenance requests
	 */
	async getOverdue(token: string): Promise<MaintenanceRequest[]> {
		if (!token) {
			this.logger.warn('Overdue maintenance requests requested without token')
			throw new BadRequestException('Authentication token is required')
		}

		this.logger.log(
			'Getting overdue maintenance requests via RLS-protected query'
		)

		const client = this.supabase.getUserClient(token)

		const { data, error } = await client
			.from('maintenance_requests')
			.select('id, unit_id, owner_user_id, tenant_id, title, description, status, priority, assigned_to, scheduled_date, completed_at, estimated_cost, actual_cost, requested_by, inspection_date, inspection_findings, inspector_id, created_at, updated_at')
			.neq('status', 'completed')
			.lt('scheduled_date', new Date().toISOString())
			.order('scheduled_date', { ascending: true })

		if (error) {
			this.logger.error(
				'Failed to get overdue maintenance requests from Supabase',
				{
					error: error.message
				}
			)
			throw new BadRequestException(
				'Failed to get overdue maintenance requests'
			)
		}

		return data as MaintenanceRequest[]
	}
}
