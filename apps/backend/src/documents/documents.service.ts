import { Injectable, Logger } from '@nestjs/common'
import { DocumentRepository } from './document.repository'
import { ErrorHandlerService } from '../common/errors/error-handler.service'
import {
  DocumentNotFoundException,
  DocumentFileException,
  DocumentFileSizeException,
  DocumentFileTypeException,
  DocumentUrlException
} from '../common/exceptions/document.exceptions'
import { CreateDocumentDto, UpdateDocumentDto, DocumentQueryDto } from './dto'
import { DocumentType } from '@prisma/client'

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name)
  
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
    private readonly errorHandler: ErrorHandlerService
  ) {}

  /**
   * Validate file constraints
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
  
  /**
   * Basic URL validation
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url)
      return ['http:', 'https:'].includes(parsedUrl.protocol)
    } catch {
      return false
    }
  }

  async getByOwner(ownerId: string, query?: DocumentQueryDto) {
    try {
      return await this.documentRepository.findByOwner(ownerId, query)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByOwner',
        resource: 'document',
        metadata: { ownerId }
      })
    }
  }

  async getStats(ownerId: string) {
    try {
      return await this.documentRepository.getStatsByOwner(ownerId)
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getStats',
        resource: 'document',
        metadata: { ownerId }
      })
    }
  }

  async getByIdOrThrow(id: string, ownerId: string) {
    try {
      const document = await this.documentRepository.findByIdAndOwner(id, ownerId)
      
      if (!document) {
        throw new DocumentNotFoundException(id)
      }
      
      return document
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'getByIdOrThrow',
        resource: 'document',
        metadata: { id, ownerId }
      })
    }
  }

  async create(data: CreateDocumentDto, ownerId: string) {
    try {
      // Validate file constraints
      this.validateFileConstraints(data)
      
      // Verify ownership of related entities
      if (data.propertyId) {
        await this.verifyPropertyOwnership(data.propertyId, ownerId)
      }
      
      if (data.leaseId) {
        await this.verifyLeaseOwnership(data.leaseId, ownerId)
      }
      
      const result = await this.documentRepository.create({
        data: {
          ...data,
          size: data.fileSizeBytes ? BigInt(data.fileSizeBytes) : undefined
        }
      })
      
      this.logger.log(`Document created: ${(result as { id: string }).id} - ${data.name}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'create',
        resource: 'document',
        metadata: { ownerId }
      })
    }
  }

  async update(id: string, data: UpdateDocumentDto, ownerId: string) {
    try {
      // Verify ownership first
      const existingDocument = await this.documentRepository.findByIdAndOwner(id, ownerId)
      
      if (!existingDocument) {
        throw new DocumentNotFoundException(id)
      }
      
      // Validate file constraints
      this.validateFileConstraints(data)
      
      // Verify ownership of related entities if changed
      if (data.propertyId && data.propertyId !== existingDocument.propertyId) {
        await this.verifyPropertyOwnership(data.propertyId, ownerId)
      }
      
      if (data.leaseId && data.leaseId !== existingDocument.leaseId) {
        await this.verifyLeaseOwnership(data.leaseId, ownerId)
      }

      const updateData = {
        ...data,
        size: data.fileSizeBytes ? BigInt(data.fileSizeBytes) : undefined
      }

      const result = await this.documentRepository.update({
        where: { id },
        data: updateData
      })
      
      this.logger.log(`Document updated: ${id}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'update',
        resource: 'document',
        metadata: { id, ownerId }
      })
    }
  }

  async delete(id: string, ownerId: string) {
    try {
      // Verify ownership first
      const exists = await this.documentRepository.findByIdAndOwner(id, ownerId)
      
      if (!exists) {
        throw new DocumentNotFoundException(id)
      }

      const result = await this.documentRepository.deleteById(id)
      this.logger.log(`Document deleted: ${id}`)
      return result
    } catch (error) {
      throw this.errorHandler.handleErrorEnhanced(error as Error, {
        operation: 'delete',
        resource: 'document',
        metadata: { id, ownerId }
      })
    }
  }

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
   * Verify that the user owns the specified property
   */
  private async verifyPropertyOwnership(propertyId: string, ownerId: string): Promise<void> {
    const property = await this.documentRepository.prismaClient.property.findFirst({
      where: { id: propertyId, ownerId }
    })
    
    if (!property) {
      throw new DocumentFileException(propertyId, 'property verification', 'Property not found or access denied')
    }
  }

  /**
   * Verify that the user owns the property associated with the lease
   */
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