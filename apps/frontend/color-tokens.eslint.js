/**
 * ESLint rules to enforce design token usage and prevent hardcoded colors
 * These rules prevent regression of the color token system implementation
 */

export default {
	rules: {
		// Prevent hardcoded hex colors
		'no-hex-colors': {
			meta: {
				type: 'problem',
				docs: {
					description:
						'Disallow hardcoded hex colors - use design tokens instead',
					category: 'Design System'
				},
				schema: [],
				messages: {
					noHexColors:
						'Hardcoded hex color "{{color}}" detected. Use design tokens (var(--color-*)) instead.'
				}
			},
			create(context) {
				const hexColorRegex = /#[0-9a-fA-F]{3,8}/g

				return {
					Literal(node) {
						if (typeof node.value === 'string') {
							const matches = node.value.match(hexColorRegex)
							if (matches) {
								matches.forEach(color => {
									context.report({
										node,
										messageId: 'noHexColors',
										data: { color }
									})
								})
							}
						}
					},
					TemplateElement(node) {
						const matches = node.value.raw.match(hexColorRegex)
						if (matches) {
							matches.forEach(color => {
								context.report({
									node,
									messageId: 'noHexColors',
									data: { color }
								})
							})
						}
					}
				}
			}
		},

		// Prevent prohibited color names (purple, pink, etc.)
		'no-prohibited-colors': {
			meta: {
				type: 'problem',
				docs: {
					description:
						'Disallow prohibited color names (purple, pink, violet, magenta)',
					category: 'Design System'
				},
				schema: [],
				messages: {
					prohibitedColor:
						'Prohibited color "{{color}}" detected. Use approved colors: red, green, blue, orange, yellow, gray only.'
				}
			},
			create(context) {
				const prohibitedColors = [
					'purple',
					'pink',
					'violet',
					'magenta',
					'fuchsia'
				]
				const prohibitedRegex = new RegExp(
					`\\b(${prohibitedColors.join('|')})\\b`,
					'gi'
				)

				return {
					Literal(node) {
						if (typeof node.value === 'string') {
							const matches = node.value.match(prohibitedRegex)
							if (matches) {
								matches.forEach(color => {
									context.report({
										node,
										messageId: 'prohibitedColor',
										data: { color }
									})
								})
							}
						}
					},
					TemplateElement(node) {
						const matches = node.value.raw.match(prohibitedRegex)
						if (matches) {
							matches.forEach(color => {
								context.report({
									node,
									messageId: 'prohibitedColor',
									data: { color }
								})
							})
						}
					}
				}
			}
		},

		// Prevent hardcoded Tailwind color classes
		'no-hardcoded-tailwind-colors': {
			meta: {
				type: 'problem',
				docs: {
					description:
						'Disallow hardcoded Tailwind color classes - use design tokens instead',
					category: 'Design System'
				},
				schema: [],
				messages: {
					hardcodedTailwind:
						'Hardcoded Tailwind color class "{{className}}" detected. Use design tokens like text-[var(--color-*)] instead.'
				}
			},
			create(context) {
				const tailwindColorRegex =
					/\b(text|bg|border)-(red|green|blue|yellow|orange|gray|slate|zinc|neutral|stone|amber|lime|emerald|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-[0-9]/g

				return {
					Literal(node) {
						if (typeof node.value === 'string') {
							const matches = node.value.match(tailwindColorRegex)
							if (matches) {
								matches.forEach(className => {
									context.report({
										node,
										messageId: 'hardcodedTailwind',
										data: { className }
									})
								})
							}
						}
					},
					TemplateElement(node) {
						const matches = node.value.raw.match(tailwindColorRegex)
						if (matches) {
							matches.forEach(className => {
								context.report({
									node,
									messageId: 'hardcodedTailwind',
									data: { className }
								})
							})
						}
					}
				}
			}
		},

		// Prevent hardcoded RGB/HSL values
		'no-hardcoded-color-functions': {
			meta: {
				type: 'problem',
				docs: {
					description:
						'Disallow hardcoded rgb(), rgba(), hsl(), hsla() values - use design tokens instead',
					category: 'Design System'
				},
				schema: [],
				messages: {
					hardcodedColorFunction:
						'Hardcoded color function "{{colorFunction}}" detected. Use design tokens (var(--color-*)) instead.'
				}
			},
			create(context) {
				const colorFunctionRegex = /(rgb|rgba|hsl|hsla)\s*\(\s*[0-9]/g

				return {
					Literal(node) {
						if (typeof node.value === 'string') {
							const matches = node.value.match(colorFunctionRegex)
							if (matches) {
								matches.forEach(colorFunction => {
									context.report({
										node,
										messageId: 'hardcodedColorFunction',
										data: { colorFunction }
									})
								})
							}
						}
					},
					TemplateElement(node) {
						const matches = node.value.raw.match(colorFunctionRegex)
						if (matches) {
							matches.forEach(colorFunction => {
								context.report({
									node,
									messageId: 'hardcodedColorFunction',
									data: { colorFunction }
								})
							})
						}
					}
				}
			}
		}
	}
}
