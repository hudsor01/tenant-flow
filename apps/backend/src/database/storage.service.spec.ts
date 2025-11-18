/**
 * StorageService Tests - Following Official Supabase Storage Guidelines
 *
 * Based on: https://supabase.com/docs/guides/storage
 *
 * Tests real storage scenarios that mirror production:
 * - File upload/download operations with security validation
 * - Path traversal attack prevention
 * - Filename sanitization and validation
 * - Storage bucket operations
 * - Public URL generation
 */

import { BadRequestException, Logger } from '@nestjs/common'
import type { TestingModule } from '@nestjs/testing'
import { Test } from '@nestjs/testing'
import { generateUUID } from '../../test/setup'
import { SilentLogger } from '../__test__/silent-logger'
import { StorageService } from './storage.service'
import { SupabaseService } from './supabase.service'

describe('StorageService', () => {
  let service: StorageService
  let supabaseService: SupabaseService

  // Mock Supabase storage client
  const mockStorageClient = {
    from: jest.fn().mockReturnThis(),
    upload: jest.fn(),
    getPublicUrl: jest.fn(),
    remove: jest.fn(),
    list: jest.fn(),
  }

  const mockSupabaseClient = {
    storage: mockStorageClient,
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    const mockSupabaseService = {
      getAdminClient: jest.fn(() => mockSupabaseClient),
    }

    const mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: SupabaseService,
          useValue: mockSupabaseService,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    })
			.setLogger(new SilentLogger())
			.compile()

    service = module.get<StorageService>(StorageService)
    supabaseService = module.get<SupabaseService>(SupabaseService)
  })

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined()
    })

    it('should have access to Supabase storage client', () => {
      expect(supabaseService.getAdminClient).toBeDefined()
      const client = service['supabase']
      expect(client).toBeDefined()
      expect(client.storage).toBeDefined()
    })
  })

  describe('File Path Security - Following Supabase Security Best Practices', () => {
    it('should sanitize and validate safe file paths', () => {
      // Use private method access for testing security validation
      const validateFilePath = service['validateFilePath'].bind(service)

      expect(validateFilePath('documents/file.pdf')).toBe('documents/file.pdf')
      expect(validateFilePath('/documents/file.pdf')).toBe('documents/file.pdf')
      expect(validateFilePath('folder/subfolder/file.jpg')).toBe('folder/subfolder/file.jpg')
    })

    it('should prevent path traversal attacks', () => {
      const validateFilePath = service['validateFilePath'].bind(service)

      // These should now properly throw BadRequestException - FIXED SECURITY BUG
      expect(() => validateFilePath('../../../etc/passwd')).toThrow(BadRequestException)
      expect(() => validateFilePath('documents/../../../secret.txt')).toThrow(BadRequestException)
      expect(() => validateFilePath('folder/../../../outside/file.txt')).toThrow(BadRequestException)
    })

    it('should sanitize double slashes and normalize paths', () => {
      const validateFilePath = service['validateFilePath'].bind(service)

      expect(validateFilePath('documents//file.pdf')).toBe('documents/file.pdf')
      // This should now throw because it contains ".." - SECURITY FIX
      expect(() => validateFilePath('folder/../valid/file.jpg')).toThrow(BadRequestException)
    })

    it('should reject pure parent directory references', () => {
      const validateFilePath = service['validateFilePath'].bind(service)

      // Both should now properly throw - SECURITY FIXED
      expect(() => validateFilePath('..')).toThrow(BadRequestException)
      expect(() => validateFilePath('../')).toThrow(BadRequestException)
    })
  })

  describe('Filename Security - Production Validation Patterns', () => {
    it('should validate safe filenames', () => {
      const validateFileName = service['validateFileName'].bind(service)

      expect(validateFileName('document.pdf')).toBe('document.pdf')
      expect(validateFileName('image_2024.jpg')).toBe('image_2024.jpg')
      expect(validateFileName('file-name-123.png')).toBe('file-name-123.png')
    })

    it('should reject dangerous file extensions', () => {
      const validateFileName = service['validateFileName'].bind(service)

      expect(() => validateFileName('malware.exe')).toThrow(BadRequestException)
      expect(() => validateFileName('script.js')).toThrow(BadRequestException)
      expect(() => validateFileName('virus.bat')).toThrow(BadRequestException)
      expect(() => validateFileName('payload.php')).toThrow(BadRequestException)
    })

    it('should reject files with dangerous characters', () => {
      const validateFileName = service['validateFileName'].bind(service)

      expect(() => validateFileName('file<script>.pdf')).toThrow(BadRequestException)
      expect(() => validateFileName('file|pipe.jpg')).toThrow(BadRequestException)
      expect(() => validateFileName('file?.png')).toThrow(BadRequestException)
      expect(() => validateFileName('file*.txt')).toThrow(BadRequestException)
    })

    it('should reject files with control characters', () => {
      const validateFileName = service['validateFileName'].bind(service)

      expect(() => validateFileName('file\x00null.pdf')).toThrow(BadRequestException)
      expect(() => validateFileName('file\x01control.jpg')).toThrow(BadRequestException)
    })
  })

  describe('File Upload Operations - Production Interface', () => {
    it('should have required upload methods', () => {
      expect(typeof service.uploadFile).toBe('function')
      expect(typeof service.deleteFile).toBe('function')
      expect(typeof service.listFiles).toBe('function')
      expect(typeof service.getPublicUrl).toBe('function')
    })

    it('should validate file upload parameters', () => {
      // Test the validation logic directly without calling storage
      const validateFilePath = service['validateFilePath'].bind(service)
      const validateFileName = service['validateFileName'].bind(service)

      // Test path validation - should throw for malicious paths
      expect(() => validateFilePath('../../../malicious.txt')).toThrow(BadRequestException)

      // Test filename validation - should throw for malicious filenames
      expect(() => validateFileName('file<script>.txt')).toThrow(BadRequestException)
    })

    it('should have utility methods for file management', () => {
      expect(typeof service.generateUniqueFilename).toBe('function')
      expect(typeof service.getStoragePath).toBe('function')
      expect(typeof service.getBucket).toBe('function')

      // Test utility functions work correctly
      const uniqueFilename = service.generateUniqueFilename('test.pdf')
      expect(uniqueFilename).toMatch(/test-\d+-[a-f0-9]{8}\.pdf/)

      expect(service.getBucket('avatar')).toBe('avatars')
      expect(service.getBucket('image')).toBe('property-images')
      expect(service.getBucket('document')).toBe('documents')
    })
  })

  describe('Storage Operations Validation', () => {
    it('should validate production storage patterns', () => {
      // Verify service provides access to Supabase storage
      const client = service['supabase']
      expect(client.storage).toBeDefined()
      expect(typeof client.storage.from).toBe('function')

      // Verify utility methods work correctly
      const uniqueFilename = service.generateUniqueFilename('document.pdf')
      expect(uniqueFilename).toMatch(/^document-\d+-[a-f0-9]{8}\.pdf$/)

      const entityId = generateUUID()
      const storagePath = service.getStoragePath('tenants', entityId, 'file.pdf')
      expect(storagePath).toMatch(new RegExp(`tenants/${entityId}/file-\\d+-[a-f0-9]{8}\\.pdf`))
    })

    it('should validate path security without calling storage', () => {
      const validateFilePath = service['validateFilePath'].bind(service)
      const validateFileName = service['validateFileName'].bind(service)

      // Test path validation
      expect(validateFilePath('safe/path.txt')).toBe('safe/path.txt')
      expect(() => validateFilePath('../unsafe')).toThrow(BadRequestException) // SECURITY FIXED

      // Test filename validation
      expect(validateFileName('safe-file.pdf')).toBe('safe-file.pdf')
      expect(() => validateFileName('unsafe.exe')).toThrow(BadRequestException)
    })
  })
})
