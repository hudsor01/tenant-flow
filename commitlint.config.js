/**
 * Commitlint configuration for TenantFlow
 * Enforces conventional commits for better release management
 * 
 * @see https://commitlint.js.org/
 * @see https://www.conventionalcommits.org/
 */

export default {
	extends: ['@commitlint/config-conventional'],
	
	rules: {
		// Enhanced type validation for better categorization
		'type-enum': [
			2,
			'always',
			[
				// Standard conventional commit types
				'feat',     // New feature
				'fix',      // Bug fix
				'docs',     // Documentation only changes
				'style',    // Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc)
				'refactor', // Code change that neither fixes a bug nor adds a feature
				'perf',     // Code change that improves performance
				'test',     // Adding missing tests or correcting existing tests
				'build',    // Changes that affect the build system or external dependencies
				'ci',       // Changes to our CI configuration files and scripts
				'chore',    // Other changes that don't modify src or test files
				'revert',   // Reverts a previous commit
				
				// TenantFlow-specific types
				'security', // Security improvements and fixes
				'deps',     // Dependency updates
				'config',   // Configuration changes
				'data',     // Database schema or migration changes
				'ui',       // UI/UX improvements
				'api',      // API changes
				'analytics' // Analytics and monitoring changes
			]
		],
		
		// Subject line requirements for clarity
		'subject-case': [2, 'always', 'lower-case'],
		'subject-empty': [2, 'never'],
		'subject-max-length': [2, 'always', 72],
		'subject-min-length': [2, 'always', 10],
		
		// Header format requirements
		'header-max-length': [2, 'always', 100],
		'header-min-length': [2, 'always', 15],
		
		// Body and footer formatting
		'body-leading-blank': [2, 'always'],
		'body-max-line-length': [2, 'always', 100],
		'footer-leading-blank': [2, 'always'],
		
		// Security-related commit requirements
		'scope-case': [2, 'always', 'lower-case'],
		'type-case': [2, 'always', 'lower-case']
	},
	
	// Custom rules for security commits
	plugins: [
		{
			rules: {
				'security-scope-required': (parsed) => {
					// Require scope for security commits
					if (parsed.type === 'security' && !parsed.scope) {
						return [false, 'Security commits must include a scope (e.g., security(auth): fix JWT validation)']
					}
					return [true]
				},
				
				'breaking-change-format': (parsed) => {
					// Ensure breaking changes are properly formatted
					if (parsed.body?.includes('BREAKING CHANGE:') || parsed.footer?.includes('BREAKING CHANGE:')) {
						if (!parsed.subject.endsWith('!')) {
							return [false, 'Breaking changes must include "!" in subject (e.g., feat!: remove deprecated API)']
						}
					}
					return [true]
				}
			}
		}
	],
	
	// Help messages
	helpUrl: 'https://github.com/conventional-changelog/commitlint/#what-is-commitlint',
	
	// Ignore patterns (for merge commits, etc.)
	ignores: [
		(commit) => commit.includes('Merge branch'),
		(commit) => commit.includes('Merge pull request'),
		(commit) => commit.includes('Initial commit')
	],
	
	// Default ignore rules
	defaultIgnores: true
}