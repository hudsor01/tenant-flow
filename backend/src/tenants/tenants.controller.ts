import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Param,
	Body,
	Query,
	UseGuards,
	Request,
	HttpException,
	HttpStatus,
	UseInterceptors,
	UploadedFile
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname } from 'path'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { RequestWithUser } from '../auth/auth.types'
import { TenantsService } from './tenants.service'

interface CreateTenantDto {
	name: string
	email: string
	phone?: string
	emergencyContact?: string
}

interface UpdateTenantDto {
	name?: string
	email?: string
	phone?: string
	emergencyContact?: string
}

interface TenantQueryDto {
	status?: string
	search?: string
	limit?: string
	offset?: string
}

interface AcceptInvitationDto {
	password: string
	userInfo: {
		id: string
		email: string
		name?: string
	}
}

@Controller('tenants')
export class TenantsController {
	constructor(private readonly tenantsService: TenantsService) {}

	@Get()
	@UseGuards(JwtAuthGuard)
	async getTenants(
		@Request() req: RequestWithUser,
		@Query() query: TenantQueryDto
	) {
		try {
			return await this.tenantsService.getTenantsByOwner(
				req.user.id,
				query
			)
		} catch {
			throw new HttpException(
				'Failed to fetch tenants',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get('stats')
	@UseGuards(JwtAuthGuard)
	async getTenantStats(@Request() req: RequestWithUser) {
		try {
			return await this.tenantsService.getTenantStats(req.user.id)
		} catch {
			throw new HttpException(
				'Failed to fetch tenant statistics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get(':id')
	@UseGuards(JwtAuthGuard)
	async getTenant(@Param('id') id: string, @Request() req: RequestWithUser) {
		try {
			const tenant = await this.tenantsService.getTenantById(
				id,
				req.user.id
			)

			if (!tenant) {
				throw new HttpException(
					'Tenant not found',
					HttpStatus.NOT_FOUND
				)
			}

			return tenant
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				'Failed to fetch tenant',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	async createTenant(
		@Body() createTenantDto: CreateTenantDto,
		@Request() req: RequestWithUser
	) {
		try {
			return await this.tenantsService.createTenant(
				req.user.id,
				createTenantDto
			)
		} catch {
			throw new HttpException(
				'Failed to create tenant',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Put(':id')
	@UseGuards(JwtAuthGuard)
	async updateTenant(
		@Param('id') id: string,
		@Body() updateTenantDto: UpdateTenantDto,
		@Request() req: RequestWithUser
	) {
		try {
			return await this.tenantsService.updateTenant(
				id,
				req.user.id,
				updateTenantDto
			)
		} catch {
			throw new HttpException(
				'Failed to update tenant',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	async deleteTenant(
		@Param('id') id: string,
		@Request() req: RequestWithUser
	) {
		try {
			await this.tenantsService.deleteTenant(id, req.user.id)
			return { message: 'Tenant deleted successfully' }
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Tenant not found'
			) {
				throw new HttpException(
					'Tenant not found',
					HttpStatus.NOT_FOUND
				)
			}
			if (
				error instanceof Error &&
				error.message === 'Cannot delete tenant with active leases'
			) {
				throw new HttpException(
					'Cannot delete tenant with active leases',
					HttpStatus.BAD_REQUEST
				)
			}
			throw new HttpException(
				'Failed to delete tenant',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post(':id/upload-document')
	@UseGuards(JwtAuthGuard)
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: './uploads/tenants',
				filename: (req, file, cb) => {
					const uniqueSuffix =
						Date.now() + '-' + Math.round(Math.random() * 1e9)
					cb(
						null,
						`${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`
					)
				}
			}),
			fileFilter: (req, file, cb) => {
				// Allow common document types
				if (!file.mimetype.match(/\/(pdf|doc|docx|jpg|jpeg|png)$/)) {
					return cb(
						new Error(
							'Only document files (PDF, DOC, DOCX) and images are allowed!'
						),
						false
					)
				}
				cb(null, true)
			},
			limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
		})
	)
	async uploadTenantDocument(
		@Param('id') id: string,
		@UploadedFile() file: Express.Multer.File,
		@Request() req: RequestWithUser,
		@Body('documentType') documentType?: string
	) {
		try {
			if (!file) {
				throw new HttpException(
					'No file uploaded',
					HttpStatus.BAD_REQUEST
				)
			}

			const fileResponse = {
				url: `/uploads/tenants/${file.filename}`,
				path: file.path,
				filename: file.filename,
				size: file.size,
				mimeType: file.mimetype,
				documentType: documentType || 'general'
			}

			return fileResponse
		} catch {
			throw new HttpException(
				'Failed to upload document',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Get('invitation/:token/verify')
	async verifyInvitation(@Param('token') token: string) {
		try {
			return await this.tenantsService.verifyInvitation(token)
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error'
			if (message.includes('Invalid') || message.includes('expired')) {
				throw new HttpException(message, HttpStatus.NOT_FOUND)
			}
			throw new HttpException(
				'Failed to verify invitation',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post('invitation/:token/accept')
	async acceptInvitation(
		@Param('token') token: string,
		@Body() acceptInvitationDto: AcceptInvitationDto
	) {
		try {
			return await this.tenantsService.acceptInvitation(
				token,
				acceptInvitationDto
			)
		} catch (error) {
			const message =
				error instanceof Error ? error.message : 'Unknown error'
			if (message.includes('Invalid') || message.includes('expired')) {
				throw new HttpException(message, HttpStatus.NOT_FOUND)
			}
			if (message.includes('already accepted')) {
				throw new HttpException(message, HttpStatus.CONFLICT)
			}
			throw new HttpException(
				'Failed to accept invitation',
				HttpStatus.BAD_REQUEST
			)
		}
	}
}
