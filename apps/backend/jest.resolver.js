// Custom Jest resolver to handle .js extensions in TypeScript imports
// This allows imports like `from './common.js'` to resolve to `./common.ts`
module.exports = (path, options) => {
	// Use the default Jest resolver
	const defaultResolver = options.defaultResolver

	// If the path ends with .js, try to resolve it as .ts first
	// This handles TypeScript's ESM requirement of using .js extensions in imports
	if (path.endsWith('.js')) {
		const tsPath = path.replace(/\.js$/, '.ts')
		try {
			return defaultResolver(tsPath, options)
		} catch (e) {
			// If .ts doesn't exist, fall back to default .js resolution
		}
	}

	// Default resolution for everything else
	return defaultResolver(path, options)
}
