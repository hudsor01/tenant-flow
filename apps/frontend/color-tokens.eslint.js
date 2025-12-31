/**
 * Custom ESLint Plugin: Color Tokens
 *
 * Enforces use of design system color tokens instead of raw hex colors.
 * Helps maintain consistent theming and prevents hard-coded color values.
 */

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
	meta: {
		name: 'color-tokens',
		version: '1.0.0'
	},
	rules: {
		'no-hex-colors': {
			meta: {
				type: 'suggestion',
				docs: {
					description: 'Disallow hex color values in favor of design system tokens',
					category: 'Stylistic Issues'
				},
				messages: {
					noHexColor: 'Avoid using hex color "{{color}}". Use Tailwind design tokens like bg-primary, text-muted-foreground, border-border instead. If this color is required for a third-party integration, add an eslint-disable comment.'
				},
				schema: []
			},
			create(context) {
				// Match hex colors: #RGB, #RRGGBB, #RGBA, #RRGGBBAA
				const hexColorRegex = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g

				// Allowed patterns (third-party requirements, brand colors in specific contexts)
				const allowedPatterns = [
					// Google brand colors (required by brand guidelines)
					/#4285[fF]4\b/, // Google Blue
					/#[dD][bB]4437\b/, // Google Red
					/#[fF]4[bB]400\b/, // Google Yellow
					/#0[fF]9[dD]58\b/, // Google Green
					// Stripe patterns
					/#635[bB][fF][fF]\b/, // Stripe Purple
				]

				function checkForHexColors(node, value) {
					if (typeof value !== 'string') return

					const matches = value.match(hexColorRegex)
					if (!matches) return

					for (const color of matches) {
						// Skip if it's an allowed pattern
						const isAllowed = allowedPatterns.some(pattern => pattern.test(color))
						if (isAllowed) continue

						context.report({
							node,
							messageId: 'noHexColor',
							data: { color }
						})
					}
				}

				return {
					Literal(node) {
						if (typeof node.value === 'string') {
							checkForHexColors(node, node.value)
						}
					},
					TemplateElement(node) {
						checkForHexColors(node, node.value.raw)
					}
				}
			}
		}
	}
}

export default plugin
