/**
 * Breadcrumbs utility tests
 *
 * Tests the generateBreadcrumbs function that converts
 * pathname strings into breadcrumb items for navigation.
 */

import { describe, it, expect } from 'vitest'
import { generateBreadcrumbs } from '../breadcrumbs'

describe('generateBreadcrumbs', () => {
	describe('basic path handling', () => {
		it('should return empty array for root path', () => {
			const result = generateBreadcrumbs('/')
			expect(result).toEqual([])
		})

		it('should generate single breadcrumb for top-level path', () => {
			const result = generateBreadcrumbs('/dashboard')
			expect(result).toEqual([{ href: '/dashboard', label: 'Dashboard' }])
		})

		it('should generate multiple breadcrumbs for nested path', () => {
			const result = generateBreadcrumbs('/properties/new')
			expect(result).toEqual([
				{ href: '/properties', label: 'Properties' },
				{ href: '/properties/new', label: 'Create New' }
			])
		})
	})

	describe('label mapping', () => {
		it('should map known route segments to labels', () => {
			const testCases = [
				{ path: '/dashboard', expected: 'Dashboard' },
				{ path: '/properties', expected: 'Properties' },
				{ path: '/tenants', expected: 'Tenants' },
				{ path: '/units', expected: 'Units' },
				{ path: '/leases', expected: 'Leases' },
				{ path: '/maintenance', expected: 'Maintenance' },
				{ path: '/analytics', expected: 'Analytics' },
				{ path: '/reports', expected: 'Reports' },
				{ path: '/settings', expected: 'Settings' }
			]

			for (const { path, expected } of testCases) {
				const result = generateBreadcrumbs(path)
				expect(result[0]?.label).toBe(expected)
			}
		})

		it('should map analytics sub-routes correctly', () => {
			const result = generateBreadcrumbs('/analytics/property-performance')
			expect(result).toEqual([
				{ href: '/analytics', label: 'Analytics' },
				{ href: '/analytics/property-performance', label: 'Property Performance' }
			])
		})

		it('should map financials routes correctly', () => {
			const testCases = [
				{
					path: '/financials/income-statement',
					expected: [
						{ href: '/financials', label: 'Financials' },
						{ href: '/financials/income-statement', label: 'Income Statement' }
					]
				},
				{
					path: '/financials/cash-flow',
					expected: [
						{ href: '/financials', label: 'Financials' },
						{ href: '/financials/cash-flow', label: 'Cash Flow' }
					]
				},
				{
					path: '/financials/balance-sheet',
					expected: [
						{ href: '/financials', label: 'Financials' },
						{ href: '/financials/balance-sheet', label: 'Balance Sheet' }
					]
				},
				{
					path: '/financials/tax-documents',
					expected: [
						{ href: '/financials', label: 'Financials' },
						{ href: '/financials/tax-documents', label: 'Tax Documents' }
					]
				}
			]

			for (const { path, expected } of testCases) {
				const result = generateBreadcrumbs(path)
				expect(result).toEqual(expected)
			}
		})

		it('should map tenant portal routes correctly', () => {
			const result = generateBreadcrumbs('/tenant/payments/history')
			expect(result).toEqual([
				{ href: '/tenant', label: 'Tenant Portal' },
				{ href: '/tenant/payments', label: 'Payments' },
				{ href: '/tenant/payments/history', label: 'Payment History' }
			])
		})

		it('should capitalize unknown segments', () => {
			const result = generateBreadcrumbs('/custom/unknown-route')
			expect(result).toEqual([
				{ href: '/custom', label: 'Custom' },
				{ href: '/custom/unknown-route', label: 'Unknown-route' }
			])
		})
	})

	describe('UUID handling', () => {
		it('should detect UUID segments and use "Details" label', () => {
			const uuid = '550e8400-e29b-41d4-a716-446655440000'
			const result = generateBreadcrumbs(`/properties/${uuid}`)
			expect(result).toEqual([
				{ href: '/properties', label: 'Properties' },
				{ href: `/properties/${uuid}`, label: 'Properties Details' }
			])
		})

		it('should handle UUID in nested paths', () => {
			const uuid = '550e8400-e29b-41d4-a716-446655440000'
			const result = generateBreadcrumbs(`/tenants/${uuid}/edit`)
			expect(result).toEqual([
				{ href: '/tenants', label: 'Tenants' },
				{ href: `/tenants/${uuid}`, label: 'Tenants Details' },
				{ href: `/tenants/${uuid}/edit`, label: 'Edit' }
			])
		})

		it('should detect lowercase UUIDs', () => {
			const uuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
			const result = generateBreadcrumbs(`/leases/${uuid}`)
			expect(result[1]?.label).toBe('Leases Details')
		})

		it('should detect uppercase UUIDs', () => {
			const uuid = 'A1B2C3D4-E5F6-7890-ABCD-EF1234567890'
			const result = generateBreadcrumbs(`/leases/${uuid}`)
			expect(result[1]?.label).toBe('Leases Details')
		})

		it('should not treat non-UUID strings as UUIDs', () => {
			const result = generateBreadcrumbs('/properties/new')
			expect(result[1]?.label).toBe('Create New')
		})
	})

	describe('edge cases', () => {
		it('should handle trailing slashes', () => {
			// Filter(Boolean) removes empty strings from split
			const result = generateBreadcrumbs('/dashboard/')
			expect(result).toEqual([{ href: '/dashboard', label: 'Dashboard' }])
		})

		it('should handle deep nesting', () => {
			const result = generateBreadcrumbs('/tenant/payments/autopay/methods')
			expect(result.length).toBe(4)
			expect(result[3]?.label).toBe('Payment Methods')
		})

		it('should handle rent-collection route', () => {
			const result = generateBreadcrumbs('/rent-collection')
			expect(result).toEqual([
				{ href: '/rent-collection', label: 'Rent Collection' }
			])
		})

		it('should handle documents routes', () => {
			const result = generateBreadcrumbs('/documents/lease-template')
			expect(result).toEqual([
				{ href: '/documents', label: 'Documents' },
				{ href: '/documents/lease-template', label: 'Lease Template' }
			])
		})
	})
})
