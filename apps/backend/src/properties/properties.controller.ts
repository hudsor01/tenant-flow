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
	HttpStatus
} from '@nestjs/common'
import type { FastifyRequest } from 'fastify'
import type { MultipartFile } from '@fastify/multipart'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import type { RequestWithUser } from '../auth/auth.types'
import { PropertiesService } from './properties.service'
import { StorageService } from '../storage/storage.service'
import type { PropertyType } from '@prisma/client'
import { validateImageFile, validateDocumentFile, multipartFileToBuffer } from '../common/file-upload.decorators'

interface CreatePropertyDto {
	name: string
	address: string
	city: string
	state: string
	zipCode: string
	description?: string
	propertyType?: PropertyType
}

interface UpdatePropertyDto {
	name?: string
	address?: string
	city?: string
	state?: string
	zipCode?: string
	description?: string
	propertyType?: PropertyType
	imageUrl?: string
}

interface PropertyQueryDto {
	propertyType?: PropertyType
	status?: string
	search?: string
	limit?: string
	offset?: string
}

@Controller('properties')
export class PropertiesController {
	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly storageService: StorageService
	) {}

	@Get()
	@UseGuards(JwtAuthGuard)
	async getProperties(
		@Request() req: RequestWithUser,
		@Query() query: PropertyQueryDto
	) {
		try {
			return await this.propertiesService.getPropertiesByOwner(
				req.user.id,
				query
			)
		} catch {
			throw new HttpException(
				'Failed to fetch properties',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get('stats')
	@UseGuards(JwtAuthGuard)
	async getPropertyStats(@Request() req: RequestWithUser) {
		try {
			return await this.propertiesService.getPropertyStats(req.user.id)
		} catch {
			throw new HttpException(
				'Failed to fetch property statistics',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get(':id')
	@UseGuards(JwtAuthGuard)
	async getProperty(
		@Param('id') id: string,
		@Request() req: RequestWithUser
	) {
		try {
			const property = await this.propertiesService.getPropertyById(
				id,
				req.user.id
			)

			if (!property) {
				throw new HttpException(
					'Property not found',
					HttpStatus.NOT_FOUND
				)
			}

			return property
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				'Failed to fetch property',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	async createProperty(
		@Body() createPropertyDto: CreatePropertyDto,
		@Request() req: RequestWithUser
	) {
		try {
			return await this.propertiesService.createProperty(
				req.user.id,
				createPropertyDto
			)
		} catch {
			throw new HttpException(
				'Failed to create property',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Put(':id')
	@UseGuards(JwtAuthGuard)
	async updateProperty(
		@Param('id') id: string,
		@Body() updatePropertyDto: UpdatePropertyDto,
		@Request() req: RequestWithUser
	) {
		try {
			return await this.propertiesService.updateProperty(
				id,
				req.user.id,
				updatePropertyDto
			)
		} catch {
			throw new HttpException(
				'Failed to update property',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	async deleteProperty(
		@Param('id') id: string,
		@Request() req: RequestWithUser
	) {
		try {
			await this.propertiesService.deleteProperty(id, req.user.id)
			return { message: 'Property deleted successfully' }
		} catch {
			throw new HttpException(
				'Failed to delete property',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Post(':id/upload-image')
	@UseGuards(JwtAuthGuard)
	async uploadPropertyImage(
		@Param('id') id: string,
		@Request() req: FastifyRequest & RequestWithUser
	) {
		try {
			// Handle multipart file upload with Fastify
			const data = await req.file()
			
			if (!data) {
				throw new HttpException(
					'No file uploaded',
					HttpStatus.BAD_REQUEST
				)
			}

			// Validate the uploaded file
			validateImageFile(data)

			// Convert multipart file to buffer
			const fileBuffer = await multipartFileToBuffer(data)

			// Verify property ownership
			const property = await this.propertiesService.getPropertyById(id, req.user.id)
			if (!property) {
				throw new HttpException(
					'Property not found',
					HttpStatus.NOT_FOUND
				)
			}

			// Upload to Supabase storage
			const bucket = this.storageService.getBucket('image')
			const storagePath = this.storageService.getStoragePath('property', id, data.filename)
			
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
				bucket: uploadResult.bucket
			}

			// Update property with image URL
			await this.propertiesService.updateProperty(id, req.user.id, {
				imageUrl: fileResponse.url
			})

			return fileResponse
		} catch (error) {
			if (error instanceof HttpException) {
				throw error
			}
			throw new HttpException(
				`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`,
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Post(':id/upload-document')
	@UseGuards(JwtAuthGuard)
	async uploadPropertyDocument(
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
			const allowedTypes = /\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|plain|jpg|jpeg|png|gif)$/
			if (!data.mimetype.match(allowedTypes)) {
				throw new HttpException(
					'Only document files (PDF, DOC, DOCX, TXT) and images are allowed!',
					HttpStatus.BAD_REQUEST
				)
			}

			// Convert multipart file to buffer
			const fileBuffer = await multipartFileToBuffer(data)

			// Verify property ownership
			const property = await this.propertiesService.getPropertyById(id, req.user.id)
			if (!property) {
				throw new HttpException(
					'Property not found',
					HttpStatus.NOT_FOUND
				)
			}

			// Upload to Supabase storage
			const bucket = this.storageService.getBucket('document')
			const storagePath = this.storageService.getStoragePath('property', id, data.filename)
			
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
