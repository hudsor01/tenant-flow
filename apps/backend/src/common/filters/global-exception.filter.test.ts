import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { Test, TestingModule } from '@nestjs/testing'
import { HttpException, HttpStatus } from '@nestjs/common'
import { ArgumentsHost } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@repo/database'
import { GlobalExceptionFilter } from './global-exception.filter'
import { ErrorHandlerService } from '../errors/error-handler.service'

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter
  let _unusedErrorHandler: ErrorHandlerService
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
            logError: jest.fn()
          }
        }
      ]
    }).compile()

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter)
    _unusedErrorHandler = module.get<ErrorHandlerService>(ErrorHandlerService)

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
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
        success: false,
        data: null,
        message: 'Test error',
        error: expect.objectContaining({
          name: 'HTTP_EXCEPTION',
          message: 'Test error',
          statusCode: 400,
          type: 'VALIDATION_ERROR',
          code: 'VALIDATION_FAILED'
        }),
        timestamp: expect.any(Date)
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

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: 'Custom business error',
        error: expect.objectContaining({
          name: 'INTERNAL_SERVER_ERROR',
          message: 'Custom business error',
          statusCode: 500,
          type: 'SERVER_ERROR',
          code: 'INTERNAL_ERROR'
        }),
        timestamp: expect.any(Date)
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
        success: false,
        data: null,
        message: 'Duplicate value for email',
        error: expect.objectContaining({
          name: 'UNIQUE_CONSTRAINT_VIOLATION',
          message: 'Duplicate value for email',
          statusCode: 409,
          type: 'SERVER_ERROR',
          code: 'INTERNAL_ERROR'
        }),
        timestamp: expect.any(Date)
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
        success: false,
        data: null,
        message: 'The requested record was not found',
        error: expect.objectContaining({
          name: 'RECORD_NOT_FOUND',
          message: 'The requested record was not found',
          statusCode: 404,
          type: 'SERVER_ERROR',
          code: 'INTERNAL_ERROR'
        }),
        timestamp: expect.any(Date)
      })
    })

    it('should handle unknown errors gracefully', () => {
      const exception = 'Unknown error'

      filter.catch(exception, mockHost)

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: 'Unknown exception: Unknown error',
        error: expect.objectContaining({
          name: 'UNKNOWN_ERROR',
          message: 'Unknown exception: Unknown error',
          statusCode: 500,
          type: 'SERVER_ERROR',
          code: 'INTERNAL_ERROR'
        }),
        timestamp: expect.any(Date)
      })
    })

    it('should include request context in error response', () => {
      const exception = new Error('Test error')

      filter.catch(exception, mockHost)

      expect(mockResponse.send).toHaveBeenCalledWith({
        success: false,
        data: null,
        message: 'Test error',
        error: expect.objectContaining({
          name: 'INTERNAL_SERVER_ERROR',
          message: 'Test error',
          statusCode: 500,
          type: 'SERVER_ERROR',
          code: 'INTERNAL_ERROR'
        }),
        timestamp: expect.any(Date)
      })
    })
  })

  describe('error code mapping', () => {
    it('should map error codes to correct HTTP status', () => {
      const testCases = [
        { errorName: 'UnauthorizedError', expectedStatus: HttpStatus.UNAUTHORIZED },
        { errorName: 'ForbiddenError', expectedStatus: HttpStatus.FORBIDDEN },
        { errorName: 'NotFoundError', expectedStatus: HttpStatus.NOT_FOUND },
        { errorName: 'ValidationError', expectedStatus: HttpStatus.BAD_REQUEST }
      ]

      testCases.forEach(({ errorName, expectedStatus }) => {
        const exception = new Error('Test error')
        exception.name = errorName

        filter.catch(exception, mockHost)

        expect(mockResponse.status).toHaveBeenCalledWith(expectedStatus)
      })
    })
  })
})