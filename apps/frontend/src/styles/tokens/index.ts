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

// Import all token modules with different aliases to avoid shadowing
// import * as colorTokens from './colors';
// import * as typographyTokens from './typography';
// import * as spacingTokens from './spacing';
// import * as componentTokens from './components';

// Composite token collections for convenience
export const tokens = {
  colors: {
    // primitive: colorTokens.primitiveColors,
    // semantic: colorTokens.semanticColors,
    // component: colorTokens.componentColors,
  },
  typography: {
    // families: typographyTokens.fontFamilies,
    // sizes: typographyTokens.fontSizes,
    // lineHeights: typographyTokens.lineHeights,
    // weights: typographyTokens.fontWeights,
    // letterSpacing: typographyTokens.letterSpacing,
    // styles: typographyTokens.textStyles,
  },
  spacing: {
    // base: spacingTokens.spacing,
    // semantic: spacingTokens.semanticSpacing,
    // component: spacingTokens.componentSpacing,
    // responsive: spacingTokens.responsiveSpacing,
  },
  components: {
    // shadcn: componentTokens.shadcnComponentTokens,
    // icons: componentTokens.iconTokens,
    // animation: componentTokens.animationTokens,
  },
} as const;

// Default export for convenience
export default tokens;