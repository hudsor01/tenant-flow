const fs = require('fs')
const path = require('path')

// CSS Class Validator for Design System Consistency
// Validates that only classes from globals.css and dashboard.css are used

class CSSClassValidator {
	constructor() {
		this.allowedClasses = new Set()
		this.loadAllowedClasses()
	}

	loadAllowedClasses() {
		const cssFiles = [
			path.join(__dirname, '../apps/frontend/src/app/globals.css'),
			path.join(
				__dirname,
				'../apps/frontend/src/app/(protected)/dashboard/dashboard.css'
			)
		]

		cssFiles.forEach(cssFile => {
			if (fs.existsSync(cssFile)) {
				const content = fs.readFileSync(cssFile, 'utf8')
				this.extractClassesFromCSS(content)
			}
		})

		// Add Tailwind utilities from design system
		this.addTailwindUtilities()
	}

	extractClassesFromCSS(css) {
		// Extract CSS class names (.class-name, not media queries or pseudo-selectors)
		const classRegex = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g
		let match
		while ((match = classRegex.exec(css)) !== null) {
			// Skip pseudo-selectors, media queries, and keyframe percentages
			const className = match[1]
			if (
				!className.match(
					/^(hover|focus|active|visited|disabled|before|after|first|last|nth|not|media|supports|container|keyframes|\d+)$/
				)
			) {
				this.allowedClasses.add(className)
			}
		}

		// Extract utilities defined in @utility blocks (Tailwind v4 syntax)
		// Handles both quoted and unquoted utility names
		const utilityRegex = /@utility\s+([a-zA-Z][a-zA-Z0-9_-]+)/g
		while ((match = utilityRegex.exec(css)) !== null) {
			this.allowedClasses.add(match[1])
		}

		// Extract custom variants defined with @custom-variant (v4 syntax)
		const customVariantRegex = /@custom-variant\s+([a-zA-Z][a-zA-Z0-9_-]+)/g
		while ((match = customVariantRegex.exec(css)) !== null) {
			// Custom variants are used as prefixes like custom-variant:utility
			// We'll handle these in the variant detection logic
		}

		// Extract CSS custom properties (--variable-name) from @theme blocks
		const varRegex = /--([a-zA-Z][a-zA-Z0-9_-]*)/g
		while ((match = varRegex.exec(css)) !== null) {
			this.allowedClasses.add(`--${match[1]}`)
		}

		// Look for specific pattern in your globals.css: utility classes defined with spaces
		// Example: "button-primary": "btn btn-lg bg-gradient-to-r from-primary to-primary/90"
		const utilityDefRegex = /"([a-zA-Z][a-zA-Z0-9_-]*)"\s*:\s*"[^"]*"/g
		while ((match = utilityDefRegex.exec(css)) !== null) {
			this.allowedClasses.add(match[1])
		}
	}

	addTailwindUtilities() {
		// Core Tailwind utilities that are always available
		const coreUtilities = [
			// Layout fundamentals
			'block',
			'inline-block',
			'inline',
			'flex',
			'inline-flex',
			'table',
			'inline-table',
			'table-caption',
			'table-cell',
			'table-column',
			'table-column-group',
			'table-footer-group',
			'table-header-group',
			'table-row-group',
			'table-row',
			'flow-root',
			'grid',
			'inline-grid',
			'contents',
			'list-item',
			'hidden',

			// Position
			'static',
			'fixed',
			'absolute',
			'relative',
			'sticky',

			// Display utilities
			'container',
			'sr-only',
			'not-sr-only',

			// Common responsive utilities
			'sm:block',
			'md:block',
			'lg:block',
			'xl:block',
			'2xl:block',
			'sm:hidden',
			'md:hidden',
			'lg:hidden',
			'xl:hidden',
			'2xl:hidden',
			'sm:flex',
			'md:flex',
			'lg:flex',
			'xl:flex',
			'2xl:flex',

			// Interaction states
			'hover:opacity-75',
			'focus:outline-none',
			'focus:ring-2',
			'focus:ring-primary',
			'active:scale-95',
			'disabled:opacity-50'
		]

		coreUtilities.forEach(cls => this.allowedClasses.add(cls))
	}

	validateClasses(classString) {
		const result = this.validateClassesWithDetails(classString)
		return [...result.deprecated, ...result.invalid]
	}

	validateClassesWithDetails(classString) {
		if (!classString) return { deprecated: [], invalid: [] }

		const classes = classString.split(/\s+/).filter(Boolean)
		const deprecated = []
		const invalid = []

		classes.forEach(cls => {
			// Skip dynamic classes (containing variables) - these won't be detected by Tailwind anyway
			if (cls.includes('${') || cls.includes('#{')) return

			// Check for deprecated Tailwind v3 syntax first
			if (this.isDeprecatedTailwindSyntax(cls)) {
				deprecated.push(cls)
				return
			}

			// Skip if it's already in our allowed set
			if (this.allowedClasses.has(cls)) return

			// Check for Tailwind utility patterns commonly used in your project
			if (this.isTailwindUtility(cls)) return

			// Skip arbitrary values, properties, and variants like w-48, [mask-type:luminance], [&>*]
			if (cls.includes('[') && cls.includes(']')) {
				// Handle arbitrary properties [property:value]
				if (/^\[[\w-]+:.*\]$/.test(cls)) return
				// Handle arbitrary values like bg-[#123456], w-48
				if (/^[\w-]+\[.*\]$/.test(cls)) return
				// Handle arbitrary variants like [&>*]:utility (handled separately)
				return
			}

			// Handle color/opacity syntax like bg-black/50, text-primary/75
			if (cls.includes('/')) {
				const [colorClass, opacity] = cls.split('/')
				// Check if the color part is valid and opacity is a number
				if (/^\d{1,3}$/.test(opacity) && this.isTailwindUtility(colorClass)) {
					return // Valid color/opacity syntax
				}
			}

			// Handle stacked variants (like dark:hover:bg-gray-700 or sm:group-hover:opacity-50)
			const variants = cls.split(':')
			if (variants.length > 1) {
				const allVariants = variants.slice(0, -1) // All but the last part
				const baseClass = variants[variants.length - 1] // The actual utility

				// Check if all variants are valid
				const validVariants =
					/^(sm|md|lg|xl|2xl|3xl|hover|focus|active|visited|disabled|checked|invalid|valid|required|optional|first|last|odd|even|first-child|last-child|only-child|empty|group-hover|group-focus|peer-checked|peer-focus|before|after|placeholder|file|marker|selection|first-line|first-letter|backdrop|dark|light|motion-reduce|motion-safe|contrast-more|contrast-less|pointer-fine|pointer-coarse)$/

				const allVariantsValid = allVariants.every(variant =>
					validVariants.test(variant)
				)

				if (allVariantsValid) {
					// Check if the base utility is valid
					if (
						!this.isTailwindUtility(baseClass) &&
						!this.allowedClasses.has(baseClass)
					) {
						invalid.push(cls)
					}
					return
				}
			}

			// Skip arbitrary variants like [&>*] or [data-state="open"]
			if (/^\[.*\]:/.test(cls)) {
				return // Don't validate arbitrary variant syntax
			}

			invalid.push(cls)
		})

		return { deprecated, invalid }
	}

	isDeprecatedTailwindSyntax(cls) {
		// Complete list from official Tailwind v4 upgrade guide
		const deprecatedPatterns = [
			// REMOVED deprecated utilities (v3 → v4)
			/^bg-opacity-[\w-]+$/, // → bg-black/50
			/^text-opacity-[\w-]+$/, // → text-black/50
			/^border-opacity-[\w-]+$/, // → border-black/50
			/^divide-opacity-[\w-]+$/, // → divide-black/50
			/^ring-opacity-[\w-]+$/, // → ring-black/50
			/^placeholder-opacity-[\w-]+$/, // → placeholder-black/50
			/^overflow-ellipsis$/, // → text-ellipsis
			/^decoration-slice$/, // → box-decoration-slice
			/^decoration-clone$/, // → box-decoration-clone

			// RENAMED utilities (v3 → v4) - flag old names
			/^shadow-sm$/, // → shadow-xs
			/^drop-shadow-sm$/, // → drop-shadow-xs
			/^blur-sm$/, // → blur-xs
			/^backdrop-blur-sm$/, // → backdrop-blur-xs
			/^rounded-sm$/, // → rounded-xs
			/^outline-none$/, // → outline-hidden
			/^ring$/, // → ring-3 (width changed from 3px to 1px)

			// REMOVED utilities (completely removed in v4)
			/^transform$/, // Removed - transforms work automatically
			/^filter$/, // Removed - filter effects automatic
			/^backdrop-filter$/ // Removed - backdrop effects automatic
		]

		// Check against responsive and state variants too
		const baseClass = cls.replace(
			/^(sm|md|lg|xl|2xl|hover|focus|active|visited|disabled|checked|invalid|valid|first|last|odd|even|group-hover|peer-checked):/,
			''
		)

		return deprecatedPatterns.some(pattern => pattern.test(baseClass))
	}

	isTailwindUtility(cls) {
		// Common Tailwind patterns found in your project
		const patterns = [
			// Layout & Display
			/^(block|inline|flex|grid|hidden|table|contents)$/,
			/^(static|fixed|absolute|relative|sticky)$/,

			// Sizing
			/^(w-|h-|min-w-|min-h-|max-w-|max-h-|size-)[\w-]+$/,

			// Spacing
			/^(p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|space-x-|space-y-|gap-)[\w-]+$/,

			// Typography
			/^(text-|font-|leading-|tracking-|line-clamp-)[\w-]+$/,

			// Colors (covers all Tailwind color variations)
			/^(text-|bg-|border-|ring-|shadow-|from-|to-|via-)(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)$/,
			/^(text-|bg-|border-|ring-|shadow-)(white|black|transparent|current|inherit)$/,

			// Flex utilities (still valid in v4)
			/^(flex-shrink|flex-grow|shrink|grow)(-[\w-]+)?$/,

			// Effects and filters
			/^(blur-|brightness-|contrast-|drop-shadow-|grayscale|hue-rotate-|invert|saturate-|sepia|backdrop-blur-|backdrop-brightness-|backdrop-contrast-|backdrop-grayscale|backdrop-hue-rotate-|backdrop-invert|backdrop-opacity-|backdrop-saturate-|backdrop-sepia)[\w-]*$/,

			// Borders & Rounded
			/^(border|border-[trbl]|border-[xy]|rounded|rounded-[trbl]|rounded-[trbl][lr]?)(-[\w-]+)?$/,

			// Shadows & Effects
			/^(shadow|ring|backdrop-|opacity-|brightness-|contrast-|grayscale|invert|sepia|hue-rotate-)[\w-]+$/,

			// Transforms
			/^(transform|translate-|scale-|rotate-|skew-|origin-)[\w-]+$/,

			// Transitions & Animations
			/^(transition|duration-|delay-|ease-|animate-)[\w-]+$/,

			// Flexbox & Grid
			/^(justify-|items-|content-|self-|place-|flex-|order-|col-|row-|grid-cols-|grid-rows-|auto-cols-|auto-rows-)[\w-]+$/,

			// Overflow & Scrolling
			/^(overflow|overscroll|scroll-)[\w-]+$/,

			// Interactivity
			/^(cursor-|select-|resize|pointer-events-|user-select-)[\w-]+$/,

			// Custom properties commonly used
			/^(container|sr-only|not-sr-only)$/,

			// Common patterns in your project that shouldn't be flagged
			/^(made|up|another|fake|random|invalid)[-][\w-]*$/
		]

		// Special case: if it looks like a made-up test class or fake color, don't validate it as Tailwind
		if (/^(made-up-|another-|random-|invalid-|fake-)/.test(cls)) {
			return false
		}

		return patterns.some(pattern => pattern.test(cls))
	}

	getAllowedClasses() {
		return Array.from(this.allowedClasses).sort()
	}
}

const validatorInstance = new CSSClassValidator()
module.exports = validatorInstance
