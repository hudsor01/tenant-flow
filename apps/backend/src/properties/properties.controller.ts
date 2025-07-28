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
import { PropertiesService } from './properties.service'
import { StorageService } from '../storage/storage.service'
import type { PropertyType } from '@prisma/client'
import type { CreatePropertyInput, UpdatePropertyInput } from '@tenantflow/shared/types/api-inputs'
import type { PropertyQuery } from '@tenantflow/shared/types/queries'
import {
	validateImageFile,
	multipartFileToBuffer
} from '../common/file-upload.decorators'


@Controller('properties')
export class PropertiesController {
	constructor(
		private readonly propertiesService: PropertiesService,
		private readonly storageService: StorageService
	) {}

	@Get()
	async getProperties(
		@Request() req: RequestWithUser,
		@Query() query: PropertyQuery
	) {
		try {
			// Convert PropertyQuery to service-compatible format
			const serviceQuery = {
				...query,
				propertyType: query.propertyType as PropertyType | undefined,
				limit: query.limit?.toString(),
				offset: query.offset?.toString()
			}
			return await this.propertiesService.getPropertiesByOwner(
				req.user.id,
				serviceQuery
			)
		} catch {
			throw new HttpException(
				'Failed to fetch properties',
				HttpStatus.INTERNAL_SERVER_ERROR
			)
		}
	}

	@Get('stats')
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
	async createProperty(
		@Body() createPropertyDto: CreatePropertyInput,
		@Request() req: RequestWithUser
	) {
		try {
			// Convert propertyType string to PropertyType enum
			const propertyData = {
				...createPropertyDto,
				propertyType: createPropertyDto.propertyType as PropertyType | undefined
			}
			return await this.propertiesService.createProperty(
				propertyData,
				req.user.id
			)
		} catch {
			throw new HttpException(
				'Failed to create property',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Put(':id')
	async updateProperty(
		@Param('id') id: string,
		@Body() updatePropertyDto: UpdatePropertyInput,
		@Request() req: RequestWithUser
	) {
		try {
			// Convert propertyType string to PropertyType enum
			const propertyData = {
				...updatePropertyDto,
				propertyType: updatePropertyDto.propertyType as PropertyType | undefined
			}
			return await this.propertiesService.updateProperty(
				id,
				propertyData,
				req.user.id
			)
		} catch {
			throw new HttpException(
				'Failed to update property',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Delete(':id')
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
	async uploadPropertyImage(
		@Param('id') id: string,
		@Request()
		req: FastifyRequest &
			RequestWithUser & { file: () => Promise<MultipartFile | null> }
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

			// Upload to Supabase storage
			const bucket = this.storageService.getBucket('image')
			const storagePath = this.storageService.getStoragePath(
				'property',
				id,
				data.filename
			)

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
			await this.propertiesService.updateProperty(id, {
				imageUrl: fileResponse.url
			}, req.user.id)

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
	async uploadPropertyDocument(
		@Param('id') id: string,
		@Request()
		req: FastifyRequest &
			RequestWithUser & { parts: () => AsyncIterable<MultipartFile> }
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
				} else if (
					part.type === 'field' &&
					part.fieldname === 'documentType'
				) {
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
			const allowedTypes =
				/\/(pdf|msword|vnd\.openxmlformats-officedocument\.wordprocessingml\.document|plain|jpg|jpeg|png|gif)$/
			if (!data.mimetype.match(allowedTypes)) {
				throw new HttpException(
					'Only document files (PDF, DOC, DOCX, TXT) and images are allowed!',
					HttpStatus.BAD_REQUEST
				)
			}

			// Convert multipart file to buffer
			const fileBuffer = await multipartFileToBuffer(data)

			// Verify property ownership
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

			// Upload to Supabase storage
			const bucket = this.storageService.getBucket('document')
			const storagePath = this.storageService.getStoragePath(
				'property',
				id,
				data.filename
			)

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
