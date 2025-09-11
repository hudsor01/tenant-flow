/**
 * ESLint rule to enforce DRY principles by detecting duplicate code patterns
 * Complements existing anti-duplication rules with more sophisticated detection
 */

export default {
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce DRY principles by detecting duplicate code patterns',
			category: 'Best Practices',
			recommended: true
		},
		fixable: null,
		schema: [
			{
				type: 'object',
				properties: {
					threshold: {
						type: 'number',
						default: 5,
						description: 'Minimum lines of similar code to flag as duplicate'
					},
					ignorePatterns: {
						type: 'array',
						items: { type: 'string' },
						default: ['test', 'spec'],
						description: 'File patterns to ignore'
					},
					allowedDuplication: {
						type: 'array',
						items: { type: 'string' },
						default: ['export interface', 'type ', 'import '],
						description: 'Patterns allowed to be duplicated'
					}
				},
				additionalProperties: false
			}
		],
		messages: {
			duplicateCode:
				'Duplicate code detected. Consider extracting to shared utility: {{suggestion}}',
			duplicateValidation:
				'Duplicate validation schema. Use generated schemas from packages/shared',
			duplicateApiCall:
				'Duplicate API call pattern. Consolidate in api-client.ts',
			duplicateComponent:
				'Similar component structure detected. Consider composition pattern'
		}
	},

	create(context) {
		const options = context.options[0] || {}
		const threshold = options.threshold || 5
		const ignorePatterns = options.ignorePatterns || ['test', 'spec']
		const allowedDuplication = options.allowedDuplication || [
			'export interface',
			'type ',
			'import '
		]

		// Storage for tracking similar code across files
		const codePatterns = new Map()
		const filename = context.getFilename()

		// Skip ignored files
		if (ignorePatterns.some(pattern => filename.includes(pattern))) {
			return {}
		}

		function hashCode(str) {
			let hash = 0
			for (let i = 0; i < str.length; i++) {
				const char = str.charCodeAt(i)
				hash = (hash << 5) - hash + char
				hash = hash & hash // Convert to 32-bit integer
			}
			return hash.toString()
		}

		function normalizeCode(code) {
			return code
				.replace(/\s+/g, ' ')
				.replace(/\/\/.*$/gm, '')
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.trim()
		}

		function isAllowedDuplication(code) {
			return allowedDuplication.some(pattern => code.includes(pattern))
		}

		function extractCodeBlock(node, context) {
			const sourceCode = context.getSourceCode()
			const start = node.range[0]
			const end = node.range[1]
			return sourceCode.text.substring(start, end)
		}

		function reportDuplication(node, message, data = {}) {
			context.report({
				node,
				messageId: message,
				data
			})
		}

		return {
			// Check function declarations for duplication
			'FunctionDeclaration, FunctionExpression, ArrowFunctionExpression'(node) {
				const code = extractCodeBlock(node, context)
				const normalized = normalizeCode(code)

				if (
					normalized.length < threshold * 20 ||
					isAllowedDuplication(normalized)
				) {
					return
				}

				const hash = hashCode(normalized)

				if (codePatterns.has(hash)) {
					const existing = codePatterns.get(hash)
					if (existing.filename !== filename) {
						reportDuplication(node, 'duplicateCode', {
							suggestion: `Consider extracting to packages/shared/src/utils/`
						})
					}
				} else {
					codePatterns.set(hash, { filename, node })
				}
			},

			// Check for duplicate validation schemas
			'CallExpression[callee.object.name="z"][callee.property.name="object"]'(
				node
			) {
				// Check if this is a validation schema that might be duplicated
				if (
					filename.includes('validation') &&
					!filename.includes('packages/shared')
				) {
					const sourceCode = context.getSourceCode()
					const text = sourceCode.getText(node)

					// Look for common validation patterns
					if (
						text.includes('email') ||
						text.includes('password') ||
						text.includes('required')
					) {
						reportDuplication(node, 'duplicateValidation')
					}
				}
			},

			// Check for duplicate API calls
			'CallExpression[callee.name=/^(fetch|axios|api)$/], CallExpression[callee.property.name=/^(get|post|put|delete|patch)$/]'(
				node
			) {
				if (
					filename.includes('api-client') ||
					filename.includes('packages/shared')
				) {
					return
				}

				const code = extractCodeBlock(node, context)
				if (code.includes('/api/') || code.includes('supabase')) {
					reportDuplication(node, 'duplicateApiCall')
				}
			},

			// Check for similar React component patterns
			JSXElement(node) {
				const sourceCode = context.getSourceCode()
				const componentText = sourceCode.getText(node)

				// Skip small components
				if (componentText.length < threshold * 30) {
					return
				}

				// Look for common component patterns that might be duplicated
				const patterns = ['className=', 'onClick=', 'onChange=', 'onSubmit=']
				const patternMatches = patterns.filter(pattern =>
					componentText.includes(pattern)
				).length

				if (patternMatches >= 3) {
					const hash = hashCode(normalizeCode(componentText.substring(0, 200)))

					if (codePatterns.has(hash)) {
						const existing = codePatterns.get(hash)
						if (existing.filename !== filename) {
							reportDuplication(node, 'duplicateComponent')
						}
					} else {
						codePatterns.set(hash, { filename, node })
					}
				}
			}
		}
	}
}
