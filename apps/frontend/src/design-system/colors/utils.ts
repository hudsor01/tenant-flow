/**
 * Color Utility Functions for Design Token System
 * Supports OKLCH color space conversions and accessibility calculations
 */

/**
 * Convert OKLCH to RGB color space
 * @param l - Lightness (0-1)
 * @param c - Chroma (0-0.4)
 * @param h - Hue (0-360)
 * @returns RGB object with values 0-255
 */
export function oklchToRgb(
	l: number,
	c: number,
	h: number
): { r: number; g: number; b: number } {
	// Convert OKLCH to XYZ D65
	const hRadians = (h * Math.PI) / 180

	// OKLCH to LCH
	const a = c * Math.cos(hRadians)
	const b = c * Math.sin(hRadians)

	// LCH to XYZ (simplified conversion for web colors)
	const y = l
	const x = y + a * 0.2
	const z = y - b * 0.1

	// XYZ to RGB (sRGB color space)
	let r = x * 3.2406 + y * -1.5372 + z * -0.4986
	let g = x * -0.9689 + y * 1.8758 + z * 0.0415
	let bValue = x * 0.0557 + y * -0.204 + z * 1.057

	// Apply gamma correction
	const gammaCorrect = (val: number) => {
		if (val > 0.0031308) {
			return 1.055 * Math.pow(val, 1 / 2.4) - 0.055
		} else {
			return 12.92 * val
		}
	}

	r = gammaCorrect(r)
	g = gammaCorrect(g)
	bValue = gammaCorrect(bValue)

	// Clamp to 0-255 range
	const clamp = (val: number) =>
		Math.max(0, Math.min(255, Math.round(val * 255)))

	return {
		r: clamp(r),
		g: clamp(g),
		b: clamp(bValue)
	}
}

/**
 * Calculate relative luminance for accessibility calculations
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Relative luminance (0-1)
 */
export function rgbToRelativeLuminance(
	r: number,
	g: number,
	b: number
): number {
	// Convert to 0-1 range
	const rSRGB = r / 255
	const gSRGB = g / 255
	const bSRGB = b / 255

	// Apply gamma correction
	const linearize = (val: number) => {
		if (val <= 0.03928) {
			return val / 12.92
		} else {
			return Math.pow((val + 0.055) / 1.055, 2.4)
		}
	}

	const rLinear = linearize(rSRGB)
	const gLinear = linearize(gSRGB)
	const bLinear = linearize(bSRGB)

	// Calculate relative luminance using ITU-R BT.709 coefficients
	return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * Convert hex color to RGB
 * @param hex - Hex color string (e.g., "#FF0000" or "#F00")
 * @returns RGB object with values 0-255
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
	// Remove # if present
	const cleanHex = hex.replace('#', '')

	// Handle 3-digit hex
	if (cleanHex.length === 3) {
		const r = parseInt(cleanHex.charAt(0) + cleanHex.charAt(0), 16)
		const g = parseInt(cleanHex.charAt(1) + cleanHex.charAt(1), 16)
		const b = parseInt(cleanHex.charAt(2) + cleanHex.charAt(2), 16)
		return { r, g, b }
	}

	// Handle 6-digit hex
	if (cleanHex.length === 6) {
		const r = parseInt(cleanHex.substring(0, 2), 16)
		const g = parseInt(cleanHex.substring(2, 2), 16)
		const b = parseInt(cleanHex.substring(4, 2), 16)
		return { r, g, b }
	}

	throw new Error(`Invalid hex color: ${hex}`)
}

/**
 * Convert RGB to hex
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @returns Hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
	const toHex = (val: number) => {
		const hex = Math.round(val).toString(16)
		return hex.length === 1 ? '0' + hex : hex
	}

	return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Generate a color palette with opacity variants
 * @param baseColor - Base OKLCH color object
 * @param opacities - Array of opacity values (0-1)
 * @returns Array of OKLCH colors with opacity variants
 */
export function generateOpacityVariants(
	baseColor: { l: number; c: number; h: number },
	opacities: number[] = [0.1, 0.15, 0.25, 0.5, 0.85]
): Array<{ l: number; c: number; h: number; alpha: number }> {
	return opacities.map(alpha => ({
		...baseColor,
		alpha
	}))
}

/**
 * Check if a color meets minimum contrast requirements
 * @param foreground - Foreground color (hex or rgb)
 * @param background - Background color (hex or rgb)
 * @param level - WCAG level ('AA' or 'AAA')
 * @param type - Content type ('normal' or 'large')
 * @returns Whether the combination meets requirements
 */
export function meetsContrastRequirement(
	foreground: string | { r: number; g: number; b: number },
	background: string | { r: number; g: number; b: number },
	level: 'AA' | 'AAA' = 'AA',
	type: 'normal' | 'large' = 'normal'
): boolean {
	const fgRgb =
		typeof foreground === 'string' ? hexToRgb(foreground) : foreground
	const bgRgb =
		typeof background === 'string' ? hexToRgb(background) : background

	const fgLuminance = rgbToRelativeLuminance(fgRgb.r, fgRgb.g, fgRgb.b)
	const bgLuminance = rgbToRelativeLuminance(bgRgb.r, bgRgb.g, bgRgb.b)

	const contrast =
		(Math.max(fgLuminance, bgLuminance) + 0.05) /
		(Math.min(fgLuminance, bgLuminance) + 0.05)

	const requirements = {
		AA: { normal: 4.5, large: 3 },
		AAA: { normal: 7, large: 4.5 }
	}

	return contrast >= requirements[level][type]
}
