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
		}
	}
}
