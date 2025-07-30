import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Test, TestingModule } from '@nestjs/testing'
import { HttpException, HttpStatus } from '@nestjs/common'
import { ArgumentsHost } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'
import { GlobalExceptionFilter } from './global-exception.filter'
import { ErrorHandlerService } from '../errors/error-handler.service'

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter
  let errorHandler: ErrorHandlerService
  let mockResponse: any
  let mockRequest: any
  let mockHost: ArgumentsHost

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: ErrorHandlerService,
          useValue: {
            logError: vi.fn()
          }
        }
      ]
    }).compile()

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter)
    errorHandler = module.get<ErrorHandlerService>(ErrorHandlerService)

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    }

    mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: { 'user-agent': 'test-agent' },
      user: { id: 'user-123' }
    }

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest
      })
    } as ArgumentsHost
  })

  describe('catch', () => {
    it('should handle HttpException correctly', () => {
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST)

      filter.catch(exception, mockHost)

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Test error',
          statusCode: HttpStatus.BAD_REQUEST,
          timestamp: expect.any(String),
          path: '/test',
          method: 'GET'
        })
      })
    })

    it('should handle custom business errors', () => {
      const exception = new Error('Custom business error')
      Object.assign(exception, {
        code: 'BUSINESS_ERROR',
        type: 'VALIDATION_ERROR',
        field: 'email'
      })

      filter.catch(exception, mockHost)

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Custom business error',
          code: 'BUSINESS_ERROR',
          type: 'VALIDATION_ERROR',
          field: 'email'
        })
      })
    })

    it('should handle Prisma unique constraint errors', () => {
      const exception = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['email'] }
        }
      )

      filter.catch(exception, mockHost)

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'RESOURCE_ALREADY_EXISTS',
          message: 'A record with this email already exists',
          statusCode: HttpStatus.CONFLICT
        })
      })
    })

    it('should handle Prisma record not found errors', () => {
      const exception = new PrismaClientKnownRequestError(
        'Record not found',
        {
          code: 'P2025',
          clientVersion: '4.0.0'
        }
      )

      filter.catch(exception, mockHost)

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: expect.objectContaining({
          code: 'RESOURCE_NOT_FOUND',
          message: 'The requested record was not found',
          statusCode: HttpStatus.NOT_FOUND
        })
      })
    })

    it('should handle unknown errors gracefully', () => {
      const exception = 'Unknown error'

      filter.catch(exception, mockHost)

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(mockResponse.send).toHaveBeenCalledWith({
        error: expect.objectContaining({
          message: 'Internal server error',
          code: 'INTERNAL_SERVER_ERROR',
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR
        })
      })
    })

    it('should include request context in error response', () => {
      const exception = new Error('Test error')

      filter.catch(exception, mockHost)

      expect(mockResponse.send).toHaveBeenCalledWith({
        error: expect.objectContaining({
          path: '/test',
          method: 'GET',
          timestamp: expect.any(String)
        })
      })
    })
  })

  describe('error code mapping', () => {
    it('should map error codes to correct HTTP status', () => {
      const testCases = [
        { code: 'UNAUTHORIZED', expectedStatus: HttpStatus.UNAUTHORIZED },
        { code: 'FORBIDDEN', expectedStatus: HttpStatus.FORBIDDEN },
        { code: 'NOT_FOUND', expectedStatus: HttpStatus.NOT_FOUND },
        { code: 'CONFLICT', expectedStatus: HttpStatus.CONFLICT },
        { code: 'PAYMENT_REQUIRED', expectedStatus: HttpStatus.PAYMENT_REQUIRED }
      ]

      testCases.forEach(({ code, expectedStatus }) => {
        const exception = new Error('Test error')
        Object.assign(exception, { code })

        filter.catch(exception, mockHost)

        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus)
      })
    })
  })
})