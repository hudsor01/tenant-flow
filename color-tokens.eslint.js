/**
 * Custom ESLint Plugin: Design Token Drift Guard
 *
 * Enforces use of design system tokens instead of raw color/spacing/duration
 * values. Four rules:
 *
 *   1. no-hex-colors      — blocks #RRGGBB / #RGB / #RRGGBBAA literals
 *   2. no-rgba-colors     — blocks rgb(...) / rgba(...) calls
 *   3. no-bg-white        — blocks the Tailwind `bg-white` class (use `bg-background`)
 *   4. no-inline-ms       — blocks Tailwind arbitrary `[NNNms]` durations (use `--duration-*`)
 *
 * Allowed escape hatches:
 *   - Brand colors (Google, Stripe) — hardcoded allowlist in no-hex-colors
 *   - File-level `eslint-disable color-tokens/<rule>` comment with a justification
 *   - File-level `ignores` in eslint.config.js (used for opengraph-image.*, templates/lease-template.*)
 */

/** @type {import('eslint').ESLint.Plugin} */
const plugin = {
	meta: {
		name: 'color-tokens',
		version: '2.0.0'
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
		},
		'no-rgba-colors': {
			meta: {
				type: 'suggestion',
				docs: {
					description: 'Disallow rgb()/rgba() color calls in favor of design system tokens',
					category: 'Stylistic Issues'
				},
				messages: {
					noRgba: 'Avoid using "{{call}}". Use Tailwind design tokens like bg-primary, text-foreground, or oklch tokens defined in globals.css. If a third-party SDK requires rgb(), add an eslint-disable comment.'
				},
				schema: []
			},
			create(context) {
				// Match rgb( or rgba( color function calls (case-insensitive).
				// Catches both space- and comma-separated syntaxes.
				const rgbaRegex = /\brgba?\s*\(/gi

				function checkForRgba(node, value) {
					if (typeof value !== 'string') return

					const matches = value.match(rgbaRegex)
					if (!matches) return

					for (const call of matches) {
						context.report({
							node,
							messageId: 'noRgba',
							data: { call: call.trim() }
						})
					}
				}

				return {
					Literal(node) {
						if (typeof node.value === 'string') {
							checkForRgba(node, node.value)
						}
					},
					TemplateElement(node) {
						checkForRgba(node, node.value.raw)
					}
				}
			}
		},
		'no-bg-white': {
			meta: {
				type: 'suggestion',
				docs: {
					description: 'Disallow the `bg-white` Tailwind class — use `bg-background` so dark-mode works',
					category: 'Stylistic Issues'
				},
				messages: {
					noBgWhite: 'Avoid "bg-white" — use "bg-background" so the surface follows light/dark theme. If a third-party requires a true white background (e.g. QR code rendering), add an eslint-disable comment with justification.'
				},
				schema: []
			},
			create(context) {
				// `bg-white` as a Tailwind class — boundary-anchored so we
				// don't false-positive on `bg-white/40` (still a violation —
				// the user should use `bg-background/40`) or `bg-whitey` (no
				// real class but defensively scoped to bg-white\b).
				const bgWhiteRegex = /\bbg-white(?:\/(?:\d{1,3}|\[[^\]]+\]))?\b/g

				function checkForBgWhite(node, value) {
					if (typeof value !== 'string') return
					if (!bgWhiteRegex.test(value)) return
					// Reset state for global regex
					bgWhiteRegex.lastIndex = 0
					context.report({
						node,
						messageId: 'noBgWhite'
					})
				}

				return {
					Literal(node) {
						if (typeof node.value === 'string') {
							checkForBgWhite(node, node.value)
						}
					},
					TemplateElement(node) {
						checkForBgWhite(node, node.value.raw)
					}
				}
			}
		},
		'no-inline-ms': {
			meta: {
				type: 'suggestion',
				docs: {
					description: 'Disallow Tailwind arbitrary [Nms] inline duration values — use --duration-* tokens',
					category: 'Stylistic Issues'
				},
				messages: {
					noInlineMs: 'Avoid Tailwind arbitrary duration "{{value}}". Use a canonical --duration-* token: duration-fast, duration-normal, duration-slow, etc. Inline ms values are a token-drift escape hatch.'
				},
				schema: []
			},
			create(context) {
				// Match Tailwind arbitrary-value duration: duration-[Nms] OR
				// raw [Nms] arbitrary inside any class string (covers
				// transition-[300ms], delay-[200ms], etc.). Excludes literal
				// CSS `Nms` outside brackets (CSS files use raw 300ms freely;
				// only Tailwind class strings get gated).
				const inlineMsRegex = /\[\s*\d+ms\s*\]/g

				function checkForInlineMs(node, value) {
					if (typeof value !== 'string') return

					const matches = value.match(inlineMsRegex)
					if (!matches) return

					for (const v of matches) {
						context.report({
							node,
							messageId: 'noInlineMs',
							data: { value: v }
						})
					}
				}

				return {
					Literal(node) {
						if (typeof node.value === 'string') {
							checkForInlineMs(node, node.value)
						}
					},
					TemplateElement(node) {
						checkForInlineMs(node, node.value.raw)
					}
				}
			}
		}
	}
}

export default plugin
