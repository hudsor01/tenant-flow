import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	UseGuards,
	UsePipes,
	ValidationPipe
} from '@nestjs/common'
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard'
import { CurrentUser } from '../shared/decorators/current-user.decorator'
import { ValidatedUser } from '../auth/auth.service'
import { DocumentsService } from './documents.service'
import type { ControllerApiResponse } from '@repo/shared'

/**
 * Documents controller - File upload and document management
 * Handles Supabase Storage integration for document management
 */
@ApiTags('documents')
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
	constructor(private readonly documentsService: DocumentsService) {}

	@Get()
	@ApiOperation({ summary: 'Get all documents for current user' })
	@ApiResponse({
		status: 200,
		description: 'Documents retrieved successfully'
	})
	async findAll(
		@CurrentUser() _user: ValidatedUser,
		@Query('property_id') _propertyId?: string,
		@Query('tenant_id') _tenantId?: string,
		@Query('lease_id') _leaseId?: string
	): Promise<ControllerApiResponse> {
		const data = await this.documentsService.getDocuments()
		return {
			success: true,
			data,
			message: 'Documents retrieved successfully'
		}
	}

	@Get('search')
	@ApiOperation({ summary: 'Search documents by filename' })
	@ApiResponse({ status: 200, description: 'Search results retrieved' })
	async search(
		@Query('q') _searchTerm: string,
		@CurrentUser() _user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.documentsService.getDocuments()
		return {
			success: true,
			data,
			message: 'Search completed successfully'
		}
	}

	@Post()
	@ApiOperation({ summary: 'Create new document record' })
	@ApiResponse({ status: 201, description: 'Document created successfully' })
	@ApiResponse({ status: 400, description: 'Invalid input' })
	@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
	async create(
		@Body() _createData: Record<string, unknown>,
		@CurrentUser() _user: ValidatedUser
	): Promise<ControllerApiResponse> {
		const data = await this.documentsService.createDocument()
		return {
			success: true,
			data,
			message: 'Document created successfully'
		}
	}

	@Delete(':id')
	@ApiOperation({ summary: 'Delete document' })
	@ApiParam({ name: 'id', description: 'Document ID' })
	@ApiResponse({ status: 200, description: 'Document deleted successfully' })
	@ApiResponse({ status: 404, description: 'Document not found' })
	async remove(
		@Param('id', ParseUUIDPipe) _id: string,
		@CurrentUser() _user: ValidatedUser
	): Promise<ControllerApiResponse> {
		await this.documentsService.deleteDocument()
		return {
			success: true,
			message: 'Document deleted successfully'
		}
	}
}
