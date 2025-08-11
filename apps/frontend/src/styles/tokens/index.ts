/**
 * Design Token System - Main Export
 * Central export point for all design tokens
 */

// Color tokens
export {
  primitiveColors,
  semanticColors,
  componentColors,
  type PrimitiveColors,
  type SemanticColors,
  type ComponentColors,
} from './colors';

// Typography tokens
export {
  fontFamilies,
  fontSizes,
  lineHeights,
  fontWeights,
  letterSpacing,
  textStyles,
  textDecoration,
  textTransform,
  type FontFamilies,
  type FontSizes,
  type LineHeights,
  type FontWeights,
  type LetterSpacing,
  type TextStyles,
} from './typography';

// Spacing tokens
export {
  spacing,
  semanticSpacing,
  componentSpacing,
  responsiveSpacing,
  type Spacing,
  type SemanticSpacing,
  type ComponentSpacing,
  type ResponsiveSpacing,
} from './spacing';

// Component tokens
export {
  shadcnComponentTokens,
  iconTokens,
  animationTokens,
  type ShadcnComponentTokens,
  type IconTokens,
  type AnimationTokens,
} from './components';

// Tailwind integration
export {
  tailwindTokens,
  tailwindUtilities,
  generateCSSVariables,
  type TailwindTokens,
  type TailwindUtilities,
} from './tailwind-integration';

// Accessibility utilities
export {
  oklchToRgb,
  getRelativeLuminance,
  getContrastRatio,
  WCAG_STANDARDS,
  meetsWCAG,
  getWCAGRating,
  testColorPair,
  testColorCombinations,
  findAccessibleColor,
  generateAccessibleVariations,
  type ContrastTestResult,
} from './utils/contrast';

// Composite token collections for convenience
export const tokens = {
  colors: {
    primitive: primitiveColors,
    semantic: semanticColors,
    component: componentColors,
  },
  typography: {
    families: fontFamilies,
    sizes: fontSizes,
    lineHeights,
    weights: fontWeights,
    letterSpacing,
    styles: textStyles,
  },
  spacing: {
    base: spacing,
    semantic: semanticSpacing,
    component: componentSpacing,
    responsive: responsiveSpacing,
  },
  components: {
    shadcn: shadcnComponentTokens,
    icons: iconTokens,
    animation: animationTokens,
  },
} as const;

// Default export for convenience
export default tokens;