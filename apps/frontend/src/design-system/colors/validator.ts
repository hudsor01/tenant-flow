/**
 * Color Contrast Validation System
 * Ensures WCAG 2.1 AA compliance for all color combinations in the design token system
 */

import { oklchToRgb, rgbToRelativeLuminance } from '../colors/utils'

export interface ContrastResult {
  ratio: number
  isAccessible: boolean
  level: 'AA' | 'AAA' | 'FAIL'
  recommendation?: string
}

export interface ColorPair {
  foreground: string
  background: string
  context: 'text' | 'ui' | 'graphics'
}

/**
 * Calculate contrast ratio between two colors
 * @param color1 - First color (foreground)
 * @param color2 - Second color (background)
 * @returns Contrast ratio (1-21)
 */
export function calculateContrastRatio(color1: string, color2: string): number {
  const rgb1 = parseColor(color1)
  const rgb2 = parseColor(color2)

  const lum1 = rgbToRelativeLuminance(rgb1.r, rgb1.g, rgb1.b)
  const lum2 = rgbToRelativeLuminance(rgb2.r, rgb2.g, rgb2.b)

  const brightest = Math.max(lum1, lum2)
  const darkest = Math.min(lum1, lum2)

  return (brightest + 0.05) / (darkest + 0.05)
}

/**
 * Validate contrast ratio against WCAG standards
 * @param ratio - Contrast ratio to validate
 * @param context - Context for the color usage
 * @returns Validation result with accessibility status
 */
export function validateContrastRatio(ratio: number, context: 'text' | 'ui' | 'graphics'): ContrastResult {
  const thresholds = {
    text: { AA: 4.5, AAA: 7 },
    ui: { AA: 3, AAA: 4.5 },
    graphics: { AA: 3, AAA: 4.5 }
  }

  const threshold = thresholds[context]

  if (ratio >= threshold.AAA) {
    return {
      ratio,
      isAccessible: true,
      level: 'AAA'
    }
  } else if (ratio >= threshold.AA) {
    return {
      ratio,
      isAccessible: true,
      level: 'AA'
    }
  } else {
    return {
      ratio,
      isAccessible: false,
      level: 'FAIL',
      recommendation: `Increase contrast to at least ${threshold.AA}:1 for ${context} (current: ${ratio.toFixed(2)}:1)`
    }
  }
}

/**
 * Parse color string to RGB values
 * Supports OKLCH, hex, rgb, and CSS custom properties
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  // Remove whitespace
  color = color.trim()

  // Handle CSS custom properties (return approximate values for validation)
  if (color.startsWith('var(--')) {
    return getCSSVariableColor(color)
  }

  // Handle OKLCH format: oklch(l c h / alpha)
  if (color.startsWith('oklch(')) {
    const match = color.match(/oklch\(([^)]+)\)/)
    if (match?.[1]) {
      const [l, c, h] = match[1].split(/\s+/).map(Number)
      return oklchToRgb(l || 0, c || 0, h || 0)
    }
  }

  // Handle hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return { r, g, b }
  }

  // Handle rgb/rgba
  if (color.startsWith('rgb')) {
    const match = color.match(/rgb\(([^)]+)\)/)
    if (match?.[1]) {
      const [r, g, b] = match[1].split(',').map(s => parseInt(s.trim()) || 0)
      return { r: r || 0, g: g || 0, b: b || 0 }
    }
  }

  // Fallback for unknown formats
  throw new Error(`Unsupported color format: ${color}`)
}

/**
 * Get approximate RGB values for CSS custom properties
 * In a real implementation, this would resolve the actual computed values
 */
function getCSSVariableColor(variable: string): { r: number; g: number; b: number } {
  // Mapping of our design tokens to approximate RGB values for validation
  const tokenMap: Record<string, { r: number; g: number; b: number }> = {
    'var(--color-system-red)': { r: 219, g: 68, b: 55 },
    'var(--color-system-green)': { r: 52, g: 199, b: 89 },
    'var(--color-system-blue)': { r: 0, g: 136, b: 255 },
    'var(--color-system-orange)': { r: 255, g: 149, b: 0 },
    'var(--color-system-yellow)': { r: 255, g: 204, b: 0 },
    'var(--color-system-gray)': { r: 142, g: 142, b: 147 },
    'var(--color-label-primary)': { r: 0, g: 0, b: 0 },
    'var(--color-label-secondary)': { r: 99, g: 99, b: 102 },
    'var(--color-fill-primary)': { r: 255, g: 255, b: 255 },
    'var(--color-fill-secondary)': { r: 242, g: 242, b: 247 },
  }

  return tokenMap[variable] || { r: 128, g: 128, b: 128 } // Default gray
}

/**
 * Validate all critical color combinations in the design system
 */
export function validateDesignSystemContrast(): Array<ColorPair & ContrastResult> {
  const criticalPairs: ColorPair[] = [
    // Primary text combinations
    { foreground: 'var(--color-label-primary)', background: 'var(--color-fill-primary)', context: 'text' },
    { foreground: 'var(--color-label-secondary)', background: 'var(--color-fill-primary)', context: 'text' },

    // System color combinations
    { foreground: 'var(--color-system-red)', background: 'var(--color-fill-primary)', context: 'ui' },
    { foreground: 'var(--color-system-green)', background: 'var(--color-fill-primary)', context: 'ui' },
    { foreground: 'var(--color-system-blue)', background: 'var(--color-fill-primary)', context: 'ui' },

    // Button combinations (assuming white text on colored backgrounds)
    { foreground: 'var(--color-fill-primary)', background: 'var(--color-system-blue)', context: 'text' },
    { foreground: 'var(--color-fill-primary)', background: 'var(--color-system-green)', context: 'text' },
    { foreground: 'var(--color-fill-primary)', background: 'var(--color-system-red)', context: 'text' },
  ]

  return criticalPairs.map(pair => {
    const ratio = calculateContrastRatio(pair.foreground, pair.background)
    const validation = validateContrastRatio(ratio, pair.context)

    return {
      ...pair,
      ...validation
    }
  })
}

/**
 * Generate a contrast validation report
 */
export function generateContrastReport(): string {
  const results = validateDesignSystemContrast()
  const failures = results.filter(r => !r.isAccessible)

  let report = '# Design System Contrast Validation Report\n\n'

  if (failures.length === 0) {
    report += '✅ All color combinations meet WCAG 2.1 AA standards!\n\n'
  } else {
    report += `❌ ${failures.length} color combination(s) failed accessibility standards:\n\n`

    failures.forEach(failure => {
      report += `- **${failure.foreground}** on **${failure.background}**\n`
      report += `  - Contrast: ${failure.ratio.toFixed(2)}:1 (${failure.level})\n`
      report += `  - Context: ${failure.context}\n`
      if (failure.recommendation) {
        report += `  - Recommendation: ${failure.recommendation}\n`
      }
      report += '\n'
    })
  }

  report += '## All Tested Combinations\n\n'
  results.forEach(result => {
    const status = result.isAccessible ? '✅' : '❌'
    report += `${status} **${result.foreground}** on **${result.background}** - ${result.ratio.toFixed(2)}:1 (${result.level})\n`
  })

  return report
}
