/**
 * Color Contrast Utilities
 * WCAG 2.1 Accessibility Testing
 */

// Convert OKLCH to RGB for contrast calculations
export function oklchToRgb(oklchString: string): [number, number, number] {
  // Parse OKLCH values
  const match = oklchString.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) {
    throw new Error(`Invalid OKLCH color: ${oklchString}`);
  }
  
  const l = parseFloat(match[1]);
  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);
  
  // Convert to Lab
  const hRad = (h * Math.PI) / 180;
  const a = c * Math.cos(hRad);
  const b = c * Math.sin(hRad);
  
  // OKLab to linear RGB
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  
  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;
  
  const r = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  const g = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  const b_calc = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;
  
  // Apply gamma correction and clamp to [0, 255]
  const gamma = (val: number) => {
    if (val <= 0.0031308) {
      return val * 12.92;
    }
    return 1.055 * Math.pow(val, 1 / 2.4) - 0.055;
  };
  
  return [
    Math.round(Math.max(0, Math.min(255, gamma(r) * 255))),
    Math.round(Math.max(0, Math.min(255, gamma(g) * 255))),
    Math.round(Math.max(0, Math.min(255, gamma(b_calc) * 255))),
  ];
}

// Calculate relative luminance (WCAG 2.1)
export function getRelativeLuminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map(val => {
    const sRGB = val / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = oklchToRgb(color1);
  const rgb2 = oklchToRgb(color2);
  
  const lum1 = getRelativeLuminance(rgb1);
  const lum2 = getRelativeLuminance(rgb2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

// WCAG 2.1 Conformance Levels
export const WCAG_STANDARDS = {
  AA: {
    normal: 4.5,      // Normal text
    large: 3.0,       // Large text (18pt+, or 14pt+ bold)
    enhanced: 7.0,    // AAA for normal text
  },
  AAA: {
    normal: 7.0,      // Normal text
    large: 4.5,       // Large text
  },
} as const;

// Check if contrast meets WCAG standard
export function meetsWCAG(
  foreground: string,
  background: string,
  standard: 'AA' | 'AAA' = 'AA',
  textSize: 'normal' | 'large' = 'normal'
): boolean {
  const ratio = getContrastRatio(foreground, background);
  const requiredRatio = WCAG_STANDARDS[standard][textSize];
  return ratio >= requiredRatio;
}

// Get WCAG rating for a contrast ratio
export function getWCAGRating(ratio: number): {
  AA: { normal: boolean; large: boolean };
  AAA: { normal: boolean; large: boolean };
  score: string;
} {
  return {
    AA: {
      normal: ratio >= WCAG_STANDARDS.AA.normal,
      large: ratio >= WCAG_STANDARDS.AA.large,
    },
    AAA: {
      normal: ratio >= WCAG_STANDARDS.AAA.normal,
      large: ratio >= WCAG_STANDARDS.AAA.large,
    },
    score: ratio.toFixed(2),
  };
}

// Test color pair and return detailed results
export interface ContrastTestResult {
  foreground: string;
  background: string;
  ratio: number;
  passes: {
    AA: { normal: boolean; large: boolean };
    AAA: { normal: boolean; large: boolean };
  };
  recommendation?: string;
}

export function testColorPair(
  foreground: string,
  background: string
): ContrastTestResult {
  const ratio = getContrastRatio(foreground, background);
  const rating = getWCAGRating(ratio);
  
  let recommendation: string | undefined;
  
  if (!rating.AA.normal) {
    if (rating.AA.large) {
      recommendation = 'Use only for large text (18pt+ or 14pt+ bold)';
    } else {
      recommendation = 'Insufficient contrast - not recommended for text';
    }
  } else if (!rating.AAA.normal && rating.AA.normal) {
    recommendation = 'Meets AA standard, suitable for most uses';
  } else if (rating.AAA.normal) {
    recommendation = 'Excellent contrast, meets highest accessibility standards';
  }
  
  return {
    foreground,
    background,
    ratio,
    passes: rating,
    recommendation,
  };
}

// Batch test multiple color combinations
export function testColorCombinations(
  combinations: Array<{ foreground: string; background: string; label: string }>
): Array<ContrastTestResult & { label: string }> {
  return combinations.map(({ foreground, background, label }) => ({
    ...testColorPair(foreground, background),
    label,
  }));
}

// Find accessible color from palette
export function findAccessibleColor(
  palette: Record<string, string>,
  background: string,
  standard: 'AA' | 'AAA' = 'AA',
  textSize: 'normal' | 'large' = 'normal'
): string | null {
  for (const [, color] of Object.entries(palette)) {
    if (meetsWCAG(color, background, standard, textSize)) {
      return color;
    }
  }
  return null;
}

// Generate accessible color variations
export function generateAccessibleVariations(
  baseColor: string,
  background: string,
  count: number = 5
): string[] {
  const variations: string[] = [];
  const baseMatch = baseColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  
  if (!baseMatch) return [baseColor];
  
  const baseL = parseFloat(baseMatch[1]);
  const baseC = parseFloat(baseMatch[2]);
  const baseH = parseFloat(baseMatch[3]);
  
  // Try different lightness values
  for (let i = 0; i < count; i++) {
    const l = baseL + (i - Math.floor(count / 2)) * 0.1;
    const candidate = `oklch(${Math.max(0, Math.min(1, l))} ${baseC} ${baseH})`;
    
    if (meetsWCAG(candidate, background, 'AA', 'normal')) {
      variations.push(candidate);
    }
  }
  
  return variations.length > 0 ? variations : [baseColor];
}