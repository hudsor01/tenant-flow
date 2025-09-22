/**
 * TenantFlow Design Token Definitions
 * Generated from tenantflow-ui-kit.tokens.json
 */

// Typography Tokens
export const TypographyTokens = {
  LargeTitle: {
    Default: {
      fontSize: '26px',
      fontWeight: 400,
      letterSpacing: '0px',
      lineHeight: 1.2307692307692308,
      fontFamily: 'Roboto',
    },
    Emphasized: {
      fontSize: '26px',
      fontWeight: 700,
      letterSpacing: '0px',
      lineHeight: 1.2307692307692308,
      fontFamily: 'Roboto',
    },
  },
  Title1: {
    Default: {
      fontSize: '22px',
      fontWeight: 400,
      letterSpacing: '0px',
      lineHeight: 1.1818181818181819,
      fontFamily: 'Roboto',
    },
    Emphasized: {
      fontSize: '22px',
      fontWeight: 700,
      letterSpacing: '0px',
      lineHeight: 1.1818181818181819,
      fontFamily: 'Roboto',
    },
  },
  Title2: {
    Default: {
      fontSize: '17px',
      fontWeight: 400,
      letterSpacing: '0px',
      lineHeight: 1.2941176470588236,
      fontFamily: 'Roboto',
    },
    Emphasized: {
      fontSize: '17px',
      fontWeight: 700,
      letterSpacing: '0px',
      lineHeight: 1.2941176470588236,
      fontFamily: 'Roboto',
    },
  },
  Title3: {
    Default: {
      fontSize: '15px',
      fontWeight: 400,
      letterSpacing: '0px',
      lineHeight: 1.3333333333333333,
      fontFamily: 'Roboto',
    },
    Emphasized: {
      fontSize: '15px',
      fontWeight: 700,
      letterSpacing: '0px',
      lineHeight: 1.3333333333333333,
      fontFamily: 'Roboto',
    },
  },
  Headline: {
    Default: {
      fontSize: '13px',
      fontWeight: 600,
      letterSpacing: '0px',
      lineHeight: 1.2307692307692308,
      fontFamily: 'Roboto',
    },
    Emphasized: {
      fontSize: '13px',
      fontWeight: 700,
      letterSpacing: '0px',
      lineHeight: 1.2307692307692308,
      fontFamily: 'Roboto',
    },
  },
  Body: {
    Default: {
      fontSize: '13px',
      fontWeight: 400,
      letterSpacing: '0px',
      lineHeight: 1.2307692307692308,
      fontFamily: 'Roboto',
    },
    Emphasized: {
      fontSize: '13px',
      fontWeight: 600,
      letterSpacing: '0px',
      lineHeight: 1.2307692307692308,
      fontFamily: 'Roboto',
    },
  },
} as const

// Color Tokens
export const ColorTokens = {
  Primary: {
    base: '#0D6FFF',
    '10': '#0D6FFF1A',
    '15': '#0D6FFF26',
    '25': '#0D6FFF40',
    '40': '#0D6FFF66',
    '50': '#0D6FFF80',
    '85': '#0D6FFFD9',
  },
  SystemColors: {
    red: '#FF383C',
    green: '#34C759',
    blue: '#0088FF',
    orange: '#FF9500',
    yellow: '#FFCC02',
    purple: '#AF52DE',
    mint: '#00C7BE',
  },
  LabelColors: {
    primary: 'rgba(0, 0, 0, 0.85)',
    secondary: 'rgba(0, 0, 0, 0.5)',
    tertiary: 'rgba(0, 0, 0, 0.25)',
    quaternary: 'rgba(0, 0, 0, 0.1)',
  },
  FillColors: {
    primary: 'rgba(0, 0, 0, 0.1)',
    secondary: 'rgba(0, 0, 0, 0.08)',
    tertiary: 'rgba(0, 0, 0, 0.05)',
  },
} as const

// Shadow Tokens
export const ShadowTokens = {
  small: '0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px rgba(26, 26, 26, 1), 1px 1px 2px rgba(26, 26, 26, 1), 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
  medium: '0px 0px 25px rgba(0, 0, 0, 0.16), 0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px rgba(26, 26, 26, 1), 1px 1px 2px rgba(26, 26, 26, 1), 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
  large: '0px 8px 32px rgba(0, 0, 0, 0.24), 0px 2px 8px rgba(0, 0, 0, 0.16), 0px 0px 2px rgba(0, 0, 0, 0.1)',
} as const

// Glass Material Tokens
export const GlassTokens = {
  material: 'linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, #fafafa 100%)',
  border: '0.5px solid rgba(0, 0, 0, 0.1)',
  shadow: '0px 0px 25px rgba(0, 0, 0, 0.16), 0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px #1a1a1a, 1px 1px 2px #1a1a1a, 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
} as const

// Animation Tokens
export const AnimationTokens = {
  duration: {
    quick: '200ms',
    standard: '300ms',
    slow: '500ms',
  },
  easing: {
    inOut: 'cubic-bezier(0.42, 0, 0.58, 1)',
    out: 'cubic-bezier(0, 0, 0.58, 1)',
    in: 'cubic-bezier(0.42, 0, 1, 1)',
  },
} as const

// Corner Radius Tokens
export const RadiusTokens = {
  small: '8px',
  medium: '12px',
  large: '16px',
  xlarge: '20px',
  xxlarge: '28px',
} as const

// Focus Ring Tokens
export const FocusTokens = {
  color: '#0D6FFF',
  width: '4px',
  offset: '2px',
} as const

// Exported type definitions for better TypeScript support
export type TypographyVariant = keyof typeof TypographyTokens
export type TypographyStyle = 'Default' | 'Emphasized'
export type ColorVariant = keyof typeof ColorTokens
export type ShadowSize = keyof typeof ShadowTokens
export type RadiusSize = keyof typeof RadiusTokens
export type AnimationDuration = keyof typeof AnimationTokens.duration
export type AnimationEasing = keyof typeof AnimationTokens.easing

// Utility functions for accessing tokens
export const getTypographyStyle = (variant: TypographyVariant, style: TypographyStyle = 'Default') => {
  return TypographyTokens[variant][style]
}

export const getColorWithOpacity = (opacity: '10' | '15' | '25' | '40' | '50' | '85') => {
  return ColorTokens.Primary[opacity]
}

export const getShadow = (size: ShadowSize) => {
  return ShadowTokens[size]
}

export const getRadius = (size: RadiusSize) => {
  return RadiusTokens[size]
}

export const getAnimationDuration = (duration: AnimationDuration) => {
  return AnimationTokens.duration[duration]
}

export const getAnimationEasing = (easing: AnimationEasing) => {
  return AnimationTokens.easing[easing]
}
