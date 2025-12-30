import {
	Controller,
	Get,
	Patch,
	Param,
	Query,
	Body,
	UseGuards
} from '@nestjs/common'
import {
	ApiBearerAuth,
	ApiBody,
	ApiOperation,
	ApiParam,
	ApiQuery,
	ApiResponse,
	ApiTags
} from '@nestjs/swagger'
import {
	AdminService,
	type AdminUserListResponse
} from '../services/admin.service'
import { AppLogger } from '../../../logger/app-logger.service'
import { Roles } from '../../../shared/decorators/roles.decorator'
import { RolesGuard } from '../../../shared/guards/roles.guard'

/**
 * Admin Users Controller
 * Handles user management endpoints for admins
 *
 * SECURITY: Protected by RolesGuard - only users with ADMIN role can access
 */
@ApiTags('Admin - Users')
@ApiBearerAuth('supabase-auth')
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
	@ApiOperation({ summary: 'List users', description: 'Get paginated list of all users with optional filtering' })
	@ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Results per page (max 100)' })
	@ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by user role' })
	@ApiQuery({ name: 'search', required: false, type: String, description: 'Search by name or email' })
	@ApiResponse({ status: 200, description: 'Users retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
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
	@ApiOperation({ summary: 'Get user details', description: 'Get detailed information about a specific user' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiResponse({ status: 200, description: 'User details retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@ApiResponse({ status: 404, description: 'User not found' })
	@Get(':id')
	async getUserDetails(@Param('id') userId: string) {
		this.logger.log('Admin: Getting user details', { userId })
		return this.adminService.getUserDetails(userId)
	}

	/**
	 * Update user role or status
	 * PATCH /api/v1/admin/users/:id
	 */
	@ApiOperation({ summary: 'Update user', description: 'Update user role or status' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiBody({ schema: { type: 'object', properties: { role: { type: 'string' }, status: { type: 'string' } } } })
	@ApiResponse({ status: 200, description: 'User updated successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@ApiResponse({ status: 404, description: 'User not found' })
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
	@ApiOperation({ summary: 'Get user activity', description: 'Get activity log for a specific user' })
	@ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'User ID' })
	@ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of results (default: 50)' })
	@ApiResponse({ status: 200, description: 'User activity retrieved successfully' })
	@ApiResponse({ status: 401, description: 'Unauthorized' })
	@ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
	@Get(':id/activity')
	async getUserActivity(
		@Param('id') userId: string,
		@Query('limit') limit = '50'
	) {
		this.logger.log('Admin: Getting user activity', { userId, limit })
		return this.adminService.getUserActivity(userId, Number(limit))
	}
}
