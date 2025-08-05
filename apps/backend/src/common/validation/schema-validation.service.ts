import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import { FastifyInstance } from 'fastify'
import { ZodSchema, ZodError } from 'zod'

/**
 * Schema-based validation service using Fastify's built-in JSON Schema validator
 * Provides 20% faster JSON serialization compared to standard JSON.stringify
 */
@Injectable()
export class SchemaValidationService {
  private readonly logger = new Logger(SchemaValidationService.name)
  
  /**
   * Register response schemas for common DTOs
   * This enables Fastify's fast JSON serialization
   */
  registerSchemas(fastify: FastifyInstance): void {
    // Property schema for fast serialization
    fastify.addSchema({
      $id: 'property',
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        name: { type: 'string' },
        address: { type: 'string' },
        city: { type: 'string' },
        state: { type: 'string', minLength: 2, maxLength: 2 },
        zipCode: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' },
        propertyType: { type: 'string' },
        ownerId: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    })

    // Unit schema
    fastify.addSchema({
      $id: 'unit',
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        unitNumber: { type: 'string' },
        propertyId: { type: 'string', format: 'uuid' },
        rent: { type: 'number', minimum: 0, maximum: 100000 },
        bedrooms: { type: 'integer', minimum: 0, maximum: 10 },
        bathrooms: { type: 'number', minimum: 0, maximum: 10 },
        squareFeet: { type: 'integer', minimum: 0 },
        status: { type: 'string', enum: ['VACANT', 'OCCUPIED', 'MAINTENANCE'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    })

    // Tenant schema
    fastify.addSchema({
      $id: 'tenant',
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string' },
        dateOfBirth: { type: 'string', format: 'date' },
        ssn: { type: 'string', pattern: '^\\d{3}-\\d{2}-\\d{4}$' },
        emergencyContact: { type: 'string' },
        emergencyPhone: { type: 'string' },
        ownerId: { type: 'string', format: 'uuid' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    })

    // Lease schema
    fastify.addSchema({
      $id: 'lease',
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        unitId: { type: 'string', format: 'uuid' },
        tenantId: { type: 'string', format: 'uuid' },
        startDate: { type: 'string', format: 'date' },
        endDate: { type: 'string', format: 'date' },
        rentAmount: { type: 'number', minimum: 0, maximum: 100000 },
        securityDeposit: { type: 'number', minimum: 0 },
        status: { type: 'string', enum: ['ACTIVE', 'EXPIRED', 'TERMINATED', 'DRAFT'] },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' }
      }
    })

    // Pagination schema
    fastify.addSchema({
      $id: 'pagination',
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        total: { type: 'integer', minimum: 0 },
        totalPages: { type: 'integer', minimum: 0 }
      }
    })

    // List response schema (reusable for all list endpoints)
    fastify.addSchema({
      $id: 'listResponse',
      type: 'object',
      properties: {
        data: { type: 'array' },
        pagination: { $ref: 'pagination#' }
      }
    })

    // Error response schema
    fastify.addSchema({
      $id: 'errorResponse',
      type: 'object',
      properties: {
        error: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'integer' },
            details: { type: 'object', additionalProperties: true }
          },
          required: ['code', 'message', 'statusCode']
        }
      },
      required: ['error']
    })

    // Success response schema
    fastify.addSchema({
      $id: 'successResponse',
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    })

    this.logger.log('JSON schemas registered for fast serialization')
  }

  /**
   * Validate data using Zod schema
   * Throws BadRequestException with detailed error information on validation failure
   */
  async validateWithZod<T>(schema: ZodSchema<T>, data: unknown): Promise<T> {
    try {
      return await schema.parseAsync(data)
    } catch (error) {
      if (error instanceof ZodError) {
        const validationErrors = error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          received: issue.received
        }))

        this.logger.warn('Zod validation failed', {
          errors: validationErrors,
          data: data
        })

        throw new BadRequestException({
          error: 'Validation Error',
          message: 'Input validation failed',
          details: validationErrors
        })
      }
      
      // Re-throw if it's not a ZodError
      throw error
    }
  }

  /**
   * Validate data with custom error message prefix
   */
  async validateOrThrow<T>(
    schema: ZodSchema<T>, 
    data: unknown, 
    options: { errorPrefix?: string } = {}
  ): Promise<T> {
    try {
      return await this.validateWithZod(schema, data)
    } catch (error) {
      if (error instanceof BadRequestException) {
        const response = error.getResponse() as any
        if (options.errorPrefix && response.message) {
          response.message = `${options.errorPrefix}: ${response.message}`
        }
        throw new BadRequestException(response)
      }
      throw error
    }
  }

  /**
   * Get schema configuration for route responses
   * This enables Fastify's schema-based serialization
   */
  getRouteSchemas() {
    return {
      // Properties endpoints
      getProperties: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: 'property#' } },
              pagination: { $ref: 'pagination#' }
            }
          },
          400: { $ref: 'errorResponse#' },
          401: { $ref: 'errorResponse#' },
          500: { $ref: 'errorResponse#' }
        }
      },
      getProperty: {
        response: {
          200: { $ref: 'property#' },
          404: { $ref: 'errorResponse#' },
          401: { $ref: 'errorResponse#' }
        }
      },
      // Units endpoints
      getUnits: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: 'unit#' } },
              pagination: { $ref: 'pagination#' }
            }
          }
        }
      },
      // Tenants endpoints  
      getTenants: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: 'tenant#' } },
              pagination: { $ref: 'pagination#' }
            }
          }
        }
      },
      // Leases endpoints
      getLeases: {
        response: {
          200: {
            type: 'object',
            properties: {
              data: { type: 'array', items: { $ref: 'lease#' } },
              pagination: { $ref: 'pagination#' }
            }
          }
        }
      },
      // Generic success/delete response
      deleteSuccess: {
        response: {
          200: { $ref: 'successResponse#' },
          404: { $ref: 'errorResponse#' }
        }
      }
    }
  }
}