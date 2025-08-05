import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus
} from '@nestjs/common'
import { DocumentsService } from './documents.service'
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { DocumentType } from '@repo/database'

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  /**
   * Get all documents for the authenticated user with optional filtering
   */
  @Get()
  async findAll(
    @CurrentUser('id') ownerId: string,
    @Query() query: DocumentQueryDto
  ) {
    return await this.documentsService.getByOwner(ownerId, query)
  }

  /**
   * Get document statistics for the authenticated user
   */
  @Get('stats')
  async getStats(@CurrentUser('id') ownerId: string) {
    return await this.documentsService.getStats(ownerId)
  }

  /**
   * Get documents by property
   */
  @Get('property/:propertyId')
  async findByProperty(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @CurrentUser('id') ownerId: string,
    @Query() query: DocumentQueryDto
  ) {
    return await this.documentsService.getByProperty(propertyId, ownerId, query)
  }

  /**
   * Get documents by lease
   */
  @Get('lease/:leaseId')
  async findByLease(
    @Param('leaseId', ParseUUIDPipe) leaseId: string,
    @CurrentUser('id') ownerId: string,
    @Query() query: DocumentQueryDto
  ) {
    return await this.documentsService.getByLease(leaseId, ownerId, query)
  }

  /**
   * Get documents by type
   */
  @Get('type/:type')
  async findByType(
    @Param('type') type: DocumentType,
    @CurrentUser('id') ownerId: string,
    @Query() query: DocumentQueryDto
  ) {
    return await this.documentsService.getByType(type, ownerId, query)
  }

  /**
   * Get a specific document by ID
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string
  ) {
    return await this.documentsService.getByIdOrThrow(id, ownerId)
  }

  /**
   * Create a new document
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @CurrentUser('id') ownerId: string
  ) {
    return await this.documentsService.create(createDocumentDto, ownerId)
  }

  /**
   * Update a document
   */
  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser('id') ownerId: string
  ) {
    return await this.documentsService.update(id, updateDocumentDto, ownerId)
  }

  /**
   * Delete a document
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') ownerId: string
  ) {
    await this.documentsService.delete(id, ownerId)
  }
}