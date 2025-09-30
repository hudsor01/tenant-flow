export default {
	'*.{js,jsx,ts,tsx}': filenames => {
		// Filter out Playwright, test files, and config files that are excluded from ESLint
		const filteredFiles = filenames.filter(
			file =>
				!file.includes('/tests/') &&
				!file.includes('.test.') &&
				!file.includes('.spec.') &&
				!file.includes('playwright.config.ts') &&
				!file.endsWith('.config.js') &&
				!file.endsWith('.config.mjs') &&
				!file.endsWith('.config.cjs')
		)

		if (filteredFiles.length === 0) return []

		return [
			`eslint --cache --fix ${filteredFiles.join(' ')}`,
			`prettier --write ${filenames.join(' ')}`
		]
	},
	'*.{json,md,mdx,css,scss,yml,yaml}': ['prettier --write']
}
