import { Injectable } from '@nestjs/common'
import { DocumentRepository } from './document.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import { BaseCrudService, BaseStats } from '../common/services/base-crud.service'
import { SecurityAuditService } from '../common/security/audit.service'
import {
  DocumentNotFoundException,
  DocumentFileException,
  DocumentFileSizeException,
  DocumentFileTypeException,
  DocumentUrlException
} from '../common/exceptions/document.exceptions'
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto'
import { Document, DocumentType, Prisma } from '@repo/database'

@Injectable()
export class DocumentsService extends BaseCrudService<
  Document,
  CreateDocumentDto,
  UpdateDocumentDto,
  DocumentQueryDto,
  Prisma.DocumentCreateInput,
  Prisma.DocumentUpdateInput,
  Prisma.DocumentWhereInput
> {
  protected readonly entityName = 'document'
  protected readonly repository: DocumentRepository
  
  // File size limits (in bytes)
  private readonly MAX_FILE_SIZE = 104857600 // 100MB
  
  // Allowed MIME types for property management documents
  private readonly ALLOWED_MIME_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv'
  ]

  constructor(
    private readonly documentRepository: DocumentRepository,
    errorHandler: ErrorHandlerService,
    auditService: SecurityAuditService
  ) {
    super(errorHandler, auditService)
    this.repository = documentRepository
  }

  /**
   * Required abstract method implementations
   */
  protected async findByIdAndOwner(id: string, ownerId: string): Promise<Document | null> {
    return await this.documentRepository.findByIdAndOwner(id, ownerId)
  }

  protected async calculateStats(ownerId: string): Promise<BaseStats> {
    return await this.documentRepository.getStatsByOwner(ownerId)
  }

  protected validateCreateData(data: CreateDocumentDto): void {
    this.validateFileConstraints(data)
  }

  protected validateUpdateData(data: UpdateDocumentDto): void {
    this.validateFileConstraints(data)
  }

  protected prepareCreateData(data: CreateDocumentDto, _ownerId: string): Prisma.DocumentCreateInput {
    return {
      ...data,
      size: data.fileSizeBytes ? BigInt(data.fileSizeBytes) : undefined
    } as unknown as Prisma.DocumentCreateInput
  }

  protected prepareUpdateData(data: UpdateDocumentDto): Prisma.DocumentUpdateInput {
    return {
      ...data,
      size: data.fileSizeBytes ? BigInt(data.fileSizeBytes) : undefined
    } as unknown as Prisma.DocumentUpdateInput
  }

  protected createOwnerWhereClause(id: string, ownerId: string): Prisma.DocumentWhereInput {
    return {
      id,
      Property: {
        ownerId
      }
    }
  }

  protected async verifyOwnership(id: string, ownerId: string): Promise<void> {
    const exists = await this.documentRepository.findByIdAndOwner(id, ownerId)
    if (!exists) {
      throw new DocumentNotFoundException(id)
    }
  }

  /**
   * Override create to add custom validations
   */
  override async create(data: CreateDocumentDto, ownerId: string): Promise<Document> {
    // Verify ownership of related entities
    if (data.propertyId) {
      await this.verifyPropertyOwnership(data.propertyId, ownerId)
    }
    
    if (data.leaseId) {
      await this.verifyLeaseOwnership(data.leaseId, ownerId)
    }
    
    return super.create(data, ownerId)
  }

  /**
   * Override update to add custom validations
   */
  override async update(id: string, data: UpdateDocumentDto, ownerId: string): Promise<Document> {
    const existingDocument = await this.findByIdAndOwner(id, ownerId)
    
    if (!existingDocument) {
      throw new DocumentNotFoundException(id)
    }
    
    // Verify ownership of related entities if changed
    if (data.propertyId && data.propertyId !== existingDocument.propertyId) {
      await this.verifyPropertyOwnership(data.propertyId, ownerId)
    }
    
    if (data.leaseId && data.leaseId !== existingDocument.leaseId) {
      await this.verifyLeaseOwnership(data.leaseId, ownerId)
    }
    
    return super.update(id, data, ownerId)
  }

  /**
   * Document-specific methods
   */
  async getByProperty(propertyId: string, ownerId: string, query?: DocumentQueryDto) {
    try {
      await this.verifyPropertyOwnership(propertyId, ownerId)
      return await this.documentRepository.findByProperty(propertyId, ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByProperty',
        resource: 'document',
        metadata: { propertyId, ownerId }
      })
    }
  }

  async getByLease(leaseId: string, ownerId: string, query?: DocumentQueryDto) {
    try {
      await this.verifyLeaseOwnership(leaseId, ownerId)
      return await this.documentRepository.findByLease(leaseId, ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByLease',
        resource: 'document',
        metadata: { leaseId, ownerId }
      })
    }
  }

  async getByType(type: DocumentType, ownerId: string, query?: DocumentQueryDto) {
    try {
      return await this.documentRepository.findByType(type, ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByType',
        resource: 'document',
        metadata: { type, ownerId }
      })
    }
  }

  /**
   * Private helper methods
   */
  private validateFileConstraints(dto: CreateDocumentDto | UpdateDocumentDto): void {
    // Validate file size
    if (dto.fileSizeBytes && dto.fileSizeBytes > this.MAX_FILE_SIZE) {
      throw new DocumentFileSizeException(
        dto.filename || dto.name || 'Unknown',
        dto.fileSizeBytes,
        this.MAX_FILE_SIZE
      )
    }
    
    // Validate MIME type
    if (dto.mimeType && !this.ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new DocumentFileTypeException(
        dto.filename || dto.name || 'Unknown',
        dto.mimeType,
        this.ALLOWED_MIME_TYPES
      )
    }
    
    // Validate URL accessibility (basic check)
    if (dto.url && !this.isValidUrl(dto.url)) {
      throw new DocumentUrlException(dto.url, 'Invalid URL format')
    }
  }
  
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return ['http:', 'https:'].includes(parsedUrl.protocol)
    } catch {
      return false
    }
  }

  private async verifyPropertyOwnership(propertyId: string, ownerId: string): Promise<void> {
    const property = await this.documentRepository.prismaClient.property.findFirst({
      where: { id: propertyId, ownerId }
    })
    
    if (!property) {
      throw new DocumentFileException(propertyId, 'property verification', 'Property not found or access denied')
    }
  }

  private async verifyLeaseOwnership(leaseId: string, ownerId: string): Promise<void> {
    const lease = await this.documentRepository.prismaClient.lease.findFirst({
      where: {
        id: leaseId,
        Unit: {
          Property: {
            ownerId
          }
        }
      }
    })
    
    if (!lease) {
      throw new DocumentFileException(leaseId, 'lease verification', 'Lease not found or access denied')
    }
  }
}