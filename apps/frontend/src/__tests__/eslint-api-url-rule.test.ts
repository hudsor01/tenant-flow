/**
 * ESLint Rule Test: no-inline-api-url-fallback
 *
 * Tests that the custom ESLint rule correctly catches violations of the
 * DRY principle for API base URL configuration.
 *
 * @see apps/frontend/eslint.config.mjs - Rule definition
 * @see CLAUDE.md - DRY principle enforcement
 */

import { ESLint } from 'eslint'
import { resolve } from 'path'

describe('ESLint Rule: no-inline-api-url-fallback', () => {
	let eslint: ESLint

	beforeAll(() => {
		// Initialize ESLint with the project's config
		eslint = new ESLint({
			cwd: resolve(__dirname, '..'),
			overrideConfigFile: resolve(__dirname, '../../eslint.config.mjs')
		})
	})

	/**
	 * Test Pattern 1: Logical OR fallback
	 * Example: process.env.NEXT_PUBLIC_API_BASE_URL || 'fallback'
	 */
	it('should catch inline API URL fallback with OR operator', async () => {
		const code = `
			const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
		`

		const results = await eslint.lintText(code, {
			filePath: 'test-violation.ts'
		})

		expect(results[0]?.messages).toContainEqual(
			expect.objectContaining({
				message: expect.stringContaining('Inline API URL fallback detected'),
				severity: 2 // Error
			})
		)
	})

	/**
	 * Test Pattern 2: Direct environment variable access
	 * Example: process.env.NEXT_PUBLIC_API_BASE_URL
	 */
	it('should catch direct access to NEXT_PUBLIC_API_BASE_URL', async () => {
		const code = `
			const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL
		`

		const results = await eslint.lintText(code, {
			filePath: 'test-violation.ts'
		})

		expect(results[0]?.messages).toContainEqual(
			expect.objectContaining({
				message: expect.stringContaining('Direct access to NEXT_PUBLIC_API_BASE_URL'),
				severity: 2 // Error
			})
		)
	})

	/**
	 * Test Pattern 3: Template literal usage
	 * Example: `${process.env.NEXT_PUBLIC_API_BASE_URL}/endpoint`
	 */
	it('should catch template literal with NEXT_PUBLIC_API_BASE_URL', async () => {
		const code = `
			const url = \`\${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/properties\`
		`

		const results = await eslint.lintText(code, {
			filePath: 'test-violation.ts'
		})

		expect(results[0]?.messages).toContainEqual(
			expect.objectContaining({
				message: expect.stringContaining('Template literal with NEXT_PUBLIC_API_BASE_URL'),
				severity: 2 // Error
			})
		)
	})

	/**
	 * Test Pattern 4: Correct usage (should NOT trigger error)
	 * Example: import { API_BASE_URL } from '@/lib/api-client'
	 */
	it('should allow correct usage with API_BASE_URL constant', async () => {
		const code = `
			import { API_BASE_URL } from '@/lib/api-client'

			const response = await fetch(\`\${API_BASE_URL}/api/v1/properties\`)
		`

		const results = await eslint.lintText(code, {
			filePath: 'test-correct.ts'
		})

		// Filter out unrelated ESLint warnings
		const apiUrlMessages = results[0]?.messages.filter((msg) =>
			msg.message.includes('API_BASE_URL') || msg.message.includes('NEXT_PUBLIC_API_BASE_URL')
		)

		expect(apiUrlMessages).toHaveLength(0)
	})

	/**
	 * Test Pattern 5: Source of truth file should be exempted
	 * The lib/api-client.ts file is allowed to use process.env
	 */
	it('should exempt lib/api-client.ts from the rule', async () => {
		const code = `
			export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4600'
		`

		const results = await eslint.lintText(code, {
			filePath: 'lib/api-client.ts'
		})

		// Filter out unrelated ESLint warnings
		const apiUrlMessages = results[0]?.messages.filter((msg) =>
			msg.message.includes('API_BASE_URL') || msg.message.includes('NEXT_PUBLIC_API_BASE_URL')
		)

		expect(apiUrlMessages).toHaveLength(0)
	})

	/**
	 * Test Pattern 6: Other environment variables should not trigger
	 * Only NEXT_PUBLIC_API_BASE_URL should be restricted
	 */
	it('should not catch other environment variables', async () => {
		const code = `
			const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://tenantflow.app'
			const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY
		`

		const results = await eslint.lintText(code, {
			filePath: 'test-other-env.ts'
		})

		// Filter to only messages about our custom rule
		const apiUrlMessages = results[0]?.messages.filter((msg) =>
			msg.message.includes('Inline API URL') ||
			msg.message.includes('Direct access to NEXT_PUBLIC_API_BASE_URL')
		) ?? []

		expect(apiUrlMessages).toHaveLength(0)
	})
})
