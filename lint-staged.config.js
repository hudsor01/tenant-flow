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
			`eslint --cache ${filteredFiles.join(' ')}`,
			`prettier --write ${filenames.join(' ')}`
		]
	},
	'*.{json,md,mdx,css,scss,yml,yaml}': ['prettier --write']
}
