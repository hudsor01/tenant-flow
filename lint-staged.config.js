/**
 * Lint-staged configuration - DISABLED
 *
 * PHILOSOPHY: Pre-commit hooks should not block commits.
 * Validation runs in CI/CD pipeline instead.
 *
 * Use manual commands for validation:
 *   pnpm lint            - Check for ESLint errors
 *   pnpm lint:fix        - Auto-fix ESLint errors
 *   prettier --check .   - Check formatting
 *   prettier --write .   - Format all files
 */
export default {
	// DISABLED: No pre-commit validation
	'*.{js,jsx,ts,tsx}': [],
	'*.{json,md,mdx,css,scss,yml,yaml}': []
}
