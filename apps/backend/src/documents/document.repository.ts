import { Injectable } from '@nestjs/common'
import { Document, DocumentType } from '@prisma/client'
import { BaseRepository } from '../common/repositories/base.repository'

export interface DocumentWithRelations extends Document {
  Property?: {
    id: string
    name: string
    address: string
    ownerId: string
  }
  Lease?: {
    id: string
    startDate: Date
    endDate: Date
    Unit: {
      id: string
      unitNumber: string
      Property: {
        id: string
        name: string
        ownerId: string
      }
    }
  }
}

export interface DocumentQueryOptions {
  type?: DocumentType
  propertyId?: string
  leaseId?: string
  mimeType?: string
  createdFrom?: string
  createdTo?: string
  minFileSize?: number
  maxFileSize?: number
  search?: string
  limit?: number
  offset?: number
  page?: number
}

@Injectable()
export class DocumentRepository extends BaseRepository {
  protected readonly modelName = 'document'
  
  // Expose prisma for complex queries
  get prismaClient() {
    return this.prisma
  }
  
  /**
   * Apply search filter for documents
   */
  protected override applySearchFilter(where: Record<string, unknown>, search: string): Record<string, unknown> {
    return {
      ...where,
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { filename: { contains: search, mode: 'insensitive' } },
        { mimeType: { contains: search, mode: 'insensitive' } },
        {
          Property: {
            name: { contains: search, mode: 'insensitive' }
          }
        },
        {
          Lease: {
            Unit: {
              unitNumber: { contains: search, mode: 'insensitive' }
            }
          }
        }
      ]
    }
  }
  
  /**
   * Override owner filter to filter by property owner or lease unit property owner
   */
  protected override addOwnerFilter(where: Record<string, unknown>, ownerId: string): Record<string, unknown> {
    return {
      ...where,
      OR: [
        // Documents linked to property directly
        {
          Property: {
            ownerId
          }
        },
        // Documents linked through lease
        {
          Lease: {
            Unit: {
              Property: {
                ownerId
              }
            }
          }
        }
      ]
    }
  }
  
  /**
   * Find documents by owner
   */
  async findByOwner(
    ownerId: string,
    options: DocumentQueryOptions = {}
  ) {
    const { search, ...paginationOptions } = options
    
    let where: Record<string, unknown> = {}
    
    // Add owner filter
    where = this.addOwnerFilter(where, ownerId)
    
    // Add type filter
    if (options.type) {
      where.type = options.type
    }
    
    // Add property filter
    if (options.propertyId) {
      where.propertyId = options.propertyId
    }
    
    // Add lease filter
    if (options.leaseId) {
      where.leaseId = options.leaseId
    }
    
    // Add MIME type filter
    if (options.mimeType) {
      where.mimeType = { contains: options.mimeType, mode: 'insensitive' }
    }
    
    // Add date range filters
    if (options.createdFrom || options.createdTo) {
      where.createdAt = {}
      if (options.createdFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(options.createdFrom)
      }
      if (options.createdTo) {
        (where.createdAt as Record<string, unknown>).lte = new Date(options.createdTo)
      }
    }
    
    // Add file size filters
    if (options.minFileSize !== undefined || options.maxFileSize !== undefined) {
      where.fileSizeBytes = {}
      if (options.minFileSize !== undefined) {
        (where.fileSizeBytes as Record<string, unknown>).gte = options.minFileSize
      }
      if (options.maxFileSize !== undefined) {
        (where.fileSizeBytes as Record<string, unknown>).lte = options.maxFileSize
      }
    }
    
    // Add search filter
    if (search) {
      where = this.applySearchFilter(where, search)
    }
    
    return await this.findMany({
      where,
      include: {
        Property: true,
        Lease: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
  
  /**
   * Get document statistics for owner
   */
  async getStatsByOwner(ownerId: string) {
    const baseWhere = this.addOwnerFilter({}, ownerId)
    
    const [
      totalCount,
      leaseDocsCount,
      invoiceCount,
      receiptCount,
      photoCount,
      totalSizeResult
    ] = await Promise.all([
      this.count({ where: baseWhere }),
      this.count({ where: { ...baseWhere, type: DocumentType.LEASE } }),
      this.count({ where: { ...baseWhere, type: DocumentType.INVOICE } }),
      this.count({ where: { ...baseWhere, type: DocumentType.RECEIPT } }),
      this.count({ where: { ...baseWhere, type: DocumentType.PROPERTY_PHOTO } }),
      this.prismaClient.document.aggregate({
        where: baseWhere,
        _sum: {
          fileSizeBytes: true
        }
      })
    ])
    
    return {
      totalDocuments: totalCount,
      leaseDocuments: leaseDocsCount,
      invoices: invoiceCount,
      receipts: receiptCount,
      propertyPhotos: photoCount,
      totalStorageBytes: Number(totalSizeResult._sum.fileSizeBytes || 0)
    }
  }
  
  /**
   * Find document by ID with owner check
   */
  async findByIdAndOwner(
    id: string,
    ownerId: string
  ): Promise<DocumentWithRelations | null> {
    return await this.findOne({
      where: {
        id,
        OR: [
          {
            Property: {
              ownerId
            }
          },
          {
            Lease: {
              Unit: {
                Property: {
                  ownerId
                }
              }
            }
          }
        ]
      },
      include: {
        Property: true,
        Lease: true
      }
    }) as Promise<DocumentWithRelations | null>
  }
  
  /**
   * Get documents by property
   */
  async findByProperty(propertyId: string, ownerId: string, options: DocumentQueryOptions = {}) {
    const { search, ...paginationOptions } = options
    
    let where: Record<string, unknown> = {
      propertyId,
      Property: {
        ownerId
      }
    }
    
    // Add filters
    if (options.type) {
      where.type = options.type
    }
    
    if (search) {
      where = this.applySearchFilter(where, search)
    }
    
    return await this.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
  
  /**
   * Get documents by lease
   */
  async findByLease(leaseId: string, ownerId: string, options: DocumentQueryOptions = {}) {
    const { search, ...paginationOptions } = options
    
    let where: Record<string, unknown> = {
      leaseId,
      Lease: {
        Unit: {
          Property: {
            ownerId
          }
        }
      }
    }
    
    // Add filters
    if (options.type) {
      where.type = options.type
    }
    
    if (search) {
      where = this.applySearchFilter(where, search)
    }
    
    return await this.findMany({
      where,
      include: {
        Lease: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
  
  /**
   * Get documents by type
   */
  async findByType(type: DocumentType, ownerId: string, options: DocumentQueryOptions = {}) {
    const { search, ...paginationOptions } = options
    
    let where: Record<string, unknown> = {
      type
    }
    
    // Add owner filter
    where = this.addOwnerFilter(where, ownerId)
    
    if (search) {
      where = this.applySearchFilter(where, search)
    }
    
    return await this.findMany({
      where,
      include: {
        Property: true,
        Lease: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      ...this.parseQueryParams(paginationOptions)
    })
  }
}