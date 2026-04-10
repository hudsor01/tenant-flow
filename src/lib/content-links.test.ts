/**
 * Content Links Mapping Tests
 *
 * Tests for the static bidirectional slug mapping config used to
 * establish internal linking between blog, resource, and compare pages.
 *
 */

import { describe, it, expect } from 'vitest'
import { RESOURCE_TO_BLOGS, BLOG_TO_RESOURCE, BLOG_TO_COMPETITOR } from './content-links'

describe('content-links', () => {
	describe('RESOURCE_TO_BLOGS', () => {
		it('has exactly 3 keys', () => {
			expect(Object.keys(RESOURCE_TO_BLOGS)).toHaveLength(3)
		})

		it("has 'seasonal-maintenance-checklist' key", () => {
			expect(RESOURCE_TO_BLOGS).toHaveProperty('seasonal-maintenance-checklist')
		})

		it("has 'landlord-tax-deduction-tracker' key", () => {
			expect(RESOURCE_TO_BLOGS).toHaveProperty('landlord-tax-deduction-tracker')
		})

		it("has 'security-deposit-reference-card' key", () => {
			expect(RESOURCE_TO_BLOGS).toHaveProperty('security-deposit-reference-card')
		})

		it("seasonal-maintenance-checklist contains 'preventive-maintenance-checklist-rental-properties-seasonal-guide'", () => {
			expect(
				RESOURCE_TO_BLOGS['seasonal-maintenance-checklist']
			).toContain('preventive-maintenance-checklist-rental-properties-seasonal-guide')
		})

		it("landlord-tax-deduction-tracker contains 'landlord-tax-deductions-missing-2025'", () => {
			expect(
				RESOURCE_TO_BLOGS['landlord-tax-deduction-tracker']
			).toContain('landlord-tax-deductions-missing-2025')
		})

		it("security-deposit-reference-card contains 'security-deposit-laws-by-state-2025'", () => {
			expect(
				RESOURCE_TO_BLOGS['security-deposit-reference-card']
			).toContain('security-deposit-laws-by-state-2025')
		})
	})

	describe('BLOG_TO_RESOURCE', () => {
		it('has exactly 3 entries', () => {
			expect(Object.keys(BLOG_TO_RESOURCE)).toHaveLength(3)
		})

		it("maps 'preventive-maintenance-checklist-rental-properties-seasonal-guide' to 'seasonal-maintenance-checklist'", () => {
			expect(
				BLOG_TO_RESOURCE['preventive-maintenance-checklist-rental-properties-seasonal-guide']
			).toBe('seasonal-maintenance-checklist')
		})

		it("maps 'landlord-tax-deductions-missing-2025' to 'landlord-tax-deduction-tracker'", () => {
			expect(
				BLOG_TO_RESOURCE['landlord-tax-deductions-missing-2025']
			).toBe('landlord-tax-deduction-tracker')
		})

		it("maps 'security-deposit-laws-by-state-2025' to 'security-deposit-reference-card'", () => {
			expect(
				BLOG_TO_RESOURCE['security-deposit-laws-by-state-2025']
			).toBe('security-deposit-reference-card')
		})
	})

	describe('BLOG_TO_COMPETITOR', () => {
		it('has exactly 3 entries', () => {
			expect(Object.keys(BLOG_TO_COMPETITOR)).toHaveLength(3)
		})

		it("maps 'tenantflow-vs-buildium-comparison' to 'buildium'", () => {
			expect(
				BLOG_TO_COMPETITOR['tenantflow-vs-buildium-comparison']
			).toBe('buildium')
		})

		it("maps 'tenantflow-vs-appfolio-comparison' to 'appfolio'", () => {
			expect(
				BLOG_TO_COMPETITOR['tenantflow-vs-appfolio-comparison']
			).toBe('appfolio')
		})

		it("maps 'tenantflow-vs-rentredi-comparison' to 'rentredi'", () => {
			expect(
				BLOG_TO_COMPETITOR['tenantflow-vs-rentredi-comparison']
			).toBe('rentredi')
		})
	})
})
