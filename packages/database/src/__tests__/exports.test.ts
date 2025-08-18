import { describe, it, expect } from '@jest/globals'

// Import all exports from the main index file
import * as dbExports from '../index'
import { checkDatabaseConnection } from '../index'
import type { DatabaseHealthResult } from '../index'

describe('Database Package Exports', () => {
	describe('Health Check Function', () => {
		it('should export checkDatabaseConnection function', () => {
			expect(dbExports.checkDatabaseConnection).toBeDefined()
			expect(typeof dbExports.checkDatabaseConnection).toBe('function')
		})

		it('should be importable directly', () => {
			expect(checkDatabaseConnection).toBeDefined()
			expect(typeof checkDatabaseConnection).toBe('function')
		})

		// Test that the function has the expected signature
		it('should accept supabaseUrl and supabaseKey parameters', () => {
			// Check function length (number of parameters)
			expect(checkDatabaseConnection.length).toBe(2)
		})
	})

	describe('Type Exports', () => {
		it('should export DatabaseHealthResult type', () => {
			// TypeScript types cannot be tested at runtime directly,
			// but we can verify they can be imported without compilation errors
			
			// This test passes if the type import doesn't cause compilation issues
			const mockResult: DatabaseHealthResult = {
				isHealthy: true,
				message: 'Test message',
				timestamp: new Date().toISOString(),
				latency: 100
			}
			
			expect(mockResult).toBeDefined()
			expect(typeof mockResult.isHealthy).toBe('boolean')
			expect(typeof mockResult.message).toBe('string')
			expect(typeof mockResult.timestamp).toBe('string')
			expect(typeof mockResult.latency).toBe('number')
		})
	})

	describe('Package Structure', () => {
		it('should only export health-related utilities', () => {
			const exportKeys = Object.keys(dbExports)
			
			// Should only export the health check function
			expect(exportKeys).toContain('checkDatabaseConnection')
			
			// Should not export Prisma-related items (legacy test expectations)
			expect(exportKeys).not.toContain('PrismaClient')
			expect(exportKeys).not.toContain('Prisma')
			expect(exportKeys).not.toContain('UserRole')
			expect(exportKeys).not.toContain('PropertyType')
			expect(exportKeys).not.toContain('UnitStatus')
			expect(exportKeys).not.toContain('LeaseStatus')
			expect(exportKeys).not.toContain('Priority')
		})

		it('should have minimal dependencies', () => {
			// This package should only depend on Supabase for health checks
			// and not include heavy ORM functionality
			expect(Object.keys(dbExports).length).toBeLessThanOrEqual(2)
		})
	})

	describe('Functional Tests', () => {
		it('should handle invalid connection parameters gracefully', async () => {
			// Test with invalid parameters
			const result = await checkDatabaseConnection('invalid-url', 'invalid-key')
			
			expect(result).toBeDefined()
			expect(typeof result.isHealthy).toBe('boolean')
			expect(typeof result.message).toBe('string')
			expect(typeof result.timestamp).toBe('string')
			expect(typeof result.latency).toBe('number')
			
			// Should return false for invalid credentials
			expect(result.isHealthy).toBe(false)
			expect(result.message).toContain('error')
		})

		it('should return proper structure for health check result', async () => {
			// Test with mock parameters (will fail but should return proper structure)
			const result = await checkDatabaseConnection(
				'https://test.supabase.co',
				'test-key'
			)
			
			// Verify the result structure matches DatabaseHealthResult interface
			expect(result).toHaveProperty('isHealthy')
			expect(result).toHaveProperty('message')
			expect(result).toHaveProperty('timestamp')
			expect(result).toHaveProperty('latency')
			
			// Verify types
			expect(typeof result.isHealthy).toBe('boolean')
			expect(typeof result.message).toBe('string')
			expect(typeof result.timestamp).toBe('string')
			expect(typeof result.latency).toBe('number')
			
			// Latency should be non-negative
			expect(result.latency).toBeGreaterThanOrEqual(0)
			
			// Timestamp should be a valid ISO string
			expect(() => new Date(result.timestamp)).not.toThrow()
		})
	})
})