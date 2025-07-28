import {
	Controller,
	Get,
	Post,
	Put,
	Delete,
	Param,
	Body,
	Query,
	Request,
	HttpException,
	HttpStatus
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import type { RequestWithUser } from '../auth/auth.types'
import { TenantsService } from './tenants.service'
import { StorageService } from '../storage/storage.service'
import { multipartFileToBuffer } from '../common/file-upload.decorators'
import type { CreateTenantInput, UpdateTenantInput } from '@tenantflow/shared/types/api-inputs'
import type { TenantQuery } from '@tenantflow/shared/types/queries'




@Controller('tenants')
export class TenantsController {
	constructor(
		private readonly tenantsService: TenantsService,
		private readonly storageService: StorageService
	) {}

	@Get()
		async getTenants(
		@Request() req: RequestWithUser,
		@Query() query: TenantQuery
	) {
		try {
			// Convert TenantQuery to service-compatible format
			const serviceQuery = {
				...query,
				limit: query.limit?.toString(),
				offset: query.offset?.toString()
			}
			return await this.tenantsService.getTenantsByOwner(
				req.user.id,
				serviceQuery
			)
		} catch {
			throw new HttpException(
				'Failed to fetch tenants',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get('stats')
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
		async createTenant(
		@Body() createTenantDto: CreateTenantInput,
		@Request() req: RequestWithUser
	) {
		try {
			return await this.tenantsService.createTenant(
				createTenantDto,
				req.user.id
			)
		} catch {
			throw new HttpException(
				'Failed to create tenant',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Put(':id')
		async updateTenant(
		@Param('id') id: string,
		@Body() updateTenantDto: UpdateTenantInput,
		@Request() req: RequestWithUser
	) {
		try {
			return await this.tenantsService.updateTenant(
				id,
				updateTenantDto,
				req.user.id
			)
		} catch {
			throw new HttpException(
				'Failed to update tenant',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Delete(':id')
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
		async uploadTenantDocument(
		@Param('id') id: string,
		@Request() req: FastifyRequest & RequestWithUser
	) {
		try {
			// Handle multipart form data with Fastify
			const parts = req.parts()
			let data: MultipartFile | null = null
			let documentType = 'general'

			// Process all parts of the multipart form
			for await (const part of parts) {
				if (part.type === 'file' && part.fieldname === 'file') {
					data = part
				} else if (part.type === 'field' && part.fieldname === 'documentType') {
					documentType = part.value as string
				}
			}
			
			if (!data) {
				throw new HttpException(
					'No file uploaded',
					HttpStatus.BAD_REQUEST
				)
			}

			// Validate the uploaded file (supports both documents and images)
			const allowedTypes = /\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|jpg|jpeg|png)$/
			if (!data.mimetype.match(allowedTypes)) {
				throw new HttpException(
					'Only document files (PDF, DOC, DOCX) and images are allowed!',
					HttpStatus.BAD_REQUEST
				)
			}

			// Convert multipart file to buffer
			const fileBuffer = await multipartFileToBuffer(data)

			// Verify tenant ownership
			const tenant = await this.tenantsService.getTenantById(id, req.user.id)
			if (!tenant) {
				throw new HttpException(
					'Tenant not found',
					HttpStatus.NOT_FOUND
				)
			}

			// Upload to Supabase storage
			const bucket = this.storageService.getBucket('document')
			const storagePath = this.storageService.getStoragePath('tenant', id, data.filename)
			
			const uploadResult = await this.storageService.uploadFile(
				bucket,
				storagePath,
				fileBuffer,
				{
					contentType: data.mimetype,
					upsert: false
				}
			)

			const fileResponse = {
				url: uploadResult.url,
				path: uploadResult.path,
				filename: uploadResult.filename,
				size: uploadResult.size,
				mimeType: uploadResult.mimeType,
				documentType: documentType,
				bucket: uploadResult.bucket
			}

			return fileResponse
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				`Failed to upload document: ${error instanceof Error ? error.message : 'Unknown error'}`,
				HttpStatus.BAD_REQUEST
			)
		}
	}

}
