import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common'
import { AdminService, type AdminUserListResponse } from '../services/admin.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { RolesGuard } from '../../../shared/guards/roles.guard'

/**
 * Admin Users Controller
 * Handles user management endpoints for admins
 * 
 * SECURITY: Protected by RolesGuard - only users with ADMIN role can access
 */
@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles('ADMIN')
export class AdminUsersController {
	constructor(
		private readonly adminService: AdminService,
		private readonly logger: AppLogger
	) {}

	/**
	 * List all users with pagination and filtering
	 * GET /api/v1/admin/users?page=1&limit=20&role=OWNER&search=john
	 */
	@Get()
	async listUsers(
		@Query('page') page = '1',
		@Query('limit') limit = '20',
		@Query('role') role?: string,
		@Query('search') search?: string
	): Promise<AdminUserListResponse> {
		this.logger.log('Admin: Listing users', {
			page,
			limit,
			role,
			search
		})

		return this.adminService.listUsers({
			page: Number(page),
			limit: Math.min(Number(limit), 100), // Max 100
			...(role && { role }),
			...(search && { search })
		})
	}

	/**
	 * Get single user details with full metadata
	 * GET /api/v1/admin/users/:id
	 */
	@Get(':id')
	async getUserDetails(@Param('id') userId: string) {
		this.logger.log('Admin: Getting user details', { userId })
		return this.adminService.getUserDetails(userId)
	}

	/**
	 * Update user role or status
	 * PATCH /api/v1/admin/users/:id
	 */
	@Patch(':id')
	async updateUser(
		@Param('id') userId: string,
		@Body() updates: { role?: string; status?: string }
	) {
		this.logger.log('Admin: Updating user', { userId, updates })
		return this.adminService.updateUser(userId, updates)
	}

	/**
	 * Get user activity log
	 * GET /api/v1/admin/users/:id/activity
	 */
	@Get(':id/activity')
	async getUserActivity(
		@Param('id') userId: string,
		@Query('limit') limit = '50'
	) {
		this.logger.log('Admin: Getting user activity', { userId, limit })
		return this.adminService.getUserActivity(userId, Number(limit))
	}
}
