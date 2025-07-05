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
import type { PropertiesService } from './properties.service'
import type { PropertyType } from '@prisma/client'

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
	constructor(private readonly propertiesService: PropertiesService) {}

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
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: './uploads/properties',
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
				if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
					return cb(new Error('Only image files are allowed!'), false)
				}
				cb(null, true)
			},
			limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
		})
	)
	async uploadPropertyImage(
		@Param('id') id: string,
		@UploadedFile() file: Express.Multer.File,
		@Request() req: RequestWithUser
	) {
		try {
			if (!file) {
				throw new HttpException(
					'No file uploaded',
					HttpStatus.BAD_REQUEST
				)
			}

			const fileResponse = {
				url: `/uploads/properties/${file.filename}`,
				path: file.path,
				filename: file.filename,
				size: file.size,
				mimeType: file.mimetype
			}

			// Update property with image URL
			await this.propertiesService.updateProperty(id, req.user.id, {
				imageUrl: fileResponse.url
			})

			return fileResponse
		} catch {
			throw new HttpException(
				'Failed to upload image',
				HttpStatus.BAD_REQUEST
			)
		}
	}

	@Post(':id/upload-document')
	@UseGuards(JwtAuthGuard)
	@UseInterceptors(
		FileInterceptor('file', {
			storage: diskStorage({
				destination: './uploads/properties',
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
				// Allow common document types and images
				if (
					!file.mimetype.match(
						/\/(pdf|doc|docx|txt|jpg|jpeg|png|gif)$/
					)
				) {
					return cb(
						new Error(
							'Only document files (PDF, DOC, DOCX, TXT) and images are allowed!'
						),
						false
					)
				}
				cb(null, true)
			},
			limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
		})
	)
	async uploadPropertyDocument(
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
				url: `/uploads/properties/${file.filename}`,
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
}
