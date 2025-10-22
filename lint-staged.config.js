/**
 * Lint-staged configuration - READ-ONLY validation
 *
 * PHILOSOPHY: Pre-commit hooks should VALIDATE, not MODIFY code.
 * Developers need to see exactly what they're committing without surprise changes.
 *
 * Use manual commands for formatting:
 *   pnpm lint:fix        - Auto-fix ESLint errors
 *   pnpm prettier:write  - Format all files
 */
export default {
	'*.{js,jsx,ts,tsx}': filenames => {
		// Filter out test files, config files, and generated files that are excluded from ESLint
		const filteredFiles = filenames.filter(
			file =>
				!file.includes('/tests/') &&
				!file.includes('/test/') &&
				!file.includes('__tests__') &&
				!file.includes('.test.') &&
				!file.includes('.spec.') &&
				!file.includes('.e2e-spec.') &&
				!file.includes('playwright.config.ts') &&
				!file.includes('vitest.config.ts') &&
				!file.includes('jest.config.js') &&
				!file.endsWith('.config.js') &&
				!file.endsWith('.config.mjs') &&
				!file.endsWith('.config.cjs') &&
				!file.endsWith('.config.ts') &&
				!file.includes('supabase-generated.ts')
		)

		if (filteredFiles.length === 0) return []

		return [
			// READ-ONLY: Check for errors, do NOT auto-fix
			`eslint --cache --max-warnings 0 ${filteredFiles.join(' ')}`,
			// READ-ONLY: Check formatting, do NOT modify files
			`prettier --check ${filenames.join(' ')}`
		]
	},
	// READ-ONLY: Check formatting for other file types
	'*.{json,md,mdx,css,scss,yml,yaml}': ['prettier --check']
}
