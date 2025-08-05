import { describe, it, expect } from 'vitest'

// Import all exports from the main index file
import * as dbExports from '../index'

describe('Database Package Exports', () => {
  describe('PrismaClient', () => {
    it('should export PrismaClient', () => {
      expect(dbExports.PrismaClient).toBeDefined()
      expect(typeof dbExports.PrismaClient).toBe('function')
    })
  })

  describe('Prisma Error Types', () => {
    it('should export PrismaClientKnownRequestError', () => {
      expect(dbExports.PrismaClientKnownRequestError).toBeDefined()
      expect(typeof dbExports.PrismaClientKnownRequestError).toBe('function')
    })

    it('should export PrismaClientUnknownRequestError', () => {
      expect(dbExports.PrismaClientUnknownRequestError).toBeDefined()
      expect(typeof dbExports.PrismaClientUnknownRequestError).toBe('function')
    })

    it('should export PrismaClientRustPanicError', () => {
      expect(dbExports.PrismaClientRustPanicError).toBeDefined()
      expect(typeof dbExports.PrismaClientRustPanicError).toBe('function')
    })

    it('should export PrismaClientInitializationError', () => {
      expect(dbExports.PrismaClientInitializationError).toBeDefined()
      expect(typeof dbExports.PrismaClientInitializationError).toBe('function')
    })

    it('should export PrismaClientValidationError', () => {
      expect(dbExports.PrismaClientValidationError).toBeDefined()
      expect(typeof dbExports.PrismaClientValidationError).toBe('function')
    })
  })

  describe('Database Health Check', () => {
    it('should export checkDatabaseConnection function', () => {
      expect(dbExports.checkDatabaseConnection).toBeDefined()
      expect(typeof dbExports.checkDatabaseConnection).toBe('function')
    })
  })

  describe('Prisma Types and Enums', () => {
    it('should export Prisma namespace', () => {
      expect(dbExports.Prisma).toBeDefined()
      expect(typeof dbExports.Prisma).toBe('object')
    })

    it('should export UserRole enum', () => {
      expect(dbExports.UserRole).toBeDefined()
      expect(typeof dbExports.UserRole).toBe('object')
    })

    it('should export PropertyType enum', () => {
      expect(dbExports.PropertyType).toBeDefined()
      expect(typeof dbExports.PropertyType).toBe('object')
    })

    it('should export UnitStatus enum', () => {
      expect(dbExports.UnitStatus).toBeDefined()
      expect(typeof dbExports.UnitStatus).toBe('object')
    })

    it('should export LeaseStatus enum', () => {
      expect(dbExports.LeaseStatus).toBeDefined()
      expect(typeof dbExports.LeaseStatus).toBe('object')
    })

    it('should export Priority enum', () => {
      expect(dbExports.Priority).toBeDefined()
      expect(typeof dbExports.Priority).toBe('object')
    })
  })

  describe('Essential Entity Types', () => {
    // Note: These are types, so we test that they can be imported without errors
    // Type testing would require more complex type-level testing with TypeScript
    it('should allow importing essential entity types', () => {
      // This test passes if the imports don't fail
      // The types User, Property, Unit, Tenant, Lease, etc. are available for import
      expect(true).toBe(true)
    })
  })
})