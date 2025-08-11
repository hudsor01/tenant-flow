/**
 * Custom Stripe Elements Appearance API Configuration
 * Matches TenantFlow's enhanced design system with OKLCH colors and glassmorphism
 */

import type { StripeElementsOptions } from '@stripe/stripe-js'

/**
 * TenantFlow Stripe Elements Theme Configuration
 * Applies glassmorphism effects and OKLCH color system to Stripe Elements
 */
export const createStripeTheme = (): StripeElementsOptions['appearance'] => {
  return {
    theme: 'stripe', // Use stripe base theme with custom styling
    variables: {
      // Color system matching globals.css
      colorPrimary: '#4f46e5', // oklch(0.52 0.18 235) approximation
      colorBackground: '#fafafa', // oklch(0.98 0.001 240) 
      colorText: '#171717', // oklch(0.15 0.02 240)
      colorDanger: '#dc2626', // destructive color
      colorSuccess: '#16a34a', // success color
      
      // Typography
      fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
      fontSizeBase: '14px',
      fontWeightNormal: '400',
      fontWeightMedium: '500',
      fontWeightBold: '600',
      
      // Spacing and sizing
      spacingUnit: '4px',
      borderRadius: '8px',
      
      // Focus states
      focusBoxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)',
      focusOutline: 'none',
    },
    rules: {
      // Base container styling
      '.Tab': {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        transition: 'all 0.2s ease',
      },
      
      '.Tab:hover': {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        transform: 'translateY(-1px)',
        boxShadow: '0 8px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      
      // Input field styling
      '.Input': {
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(5px)',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '12px 16px',
        fontSize: '14px',
        transition: 'all 0.15s ease',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      },
      
      '.Input:focus': {
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        outline: 'none',
      },
      
      '.Input:hover': {
        borderColor: '#d1d5db',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
      },
      
      '.Input::placeholder': {
        color: '#9ca3af',
      },
      
      // Error states
      '.Input--invalid': {
        borderColor: '#dc2626',
        backgroundColor: 'rgba(254, 242, 242, 0.8)',
      },
      
      '.Input--invalid:focus': {
        boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.1)',
        borderColor: '#dc2626',
      },
      
      // Success states
      '.Input--complete': {
        borderColor: '#16a34a',
        backgroundColor: 'rgba(240, 253, 244, 0.8)',
      },
      
      // Labels
      '.Label': {
        fontSize: '13px',
        fontWeight: '500',
        color: '#374151',
        marginBottom: '6px',
      },
      
      // Error messages
      '.Error': {
        color: '#dc2626',
        fontSize: '12px',
        marginTop: '4px',
        fontWeight: '500',
      },
      
      // Loading states
      '.Spinner': {
        color: '#4f46e5',
      },
      
      // Payment method tabs
      '.TabLabel': {
        color: '#6b7280',
        fontSize: '13px',
        fontWeight: '500',
        transition: 'color 0.15s ease',
      },
      
      '.Tab--selected .TabLabel': {
        color: '#4f46e5',
        fontWeight: '600',
      },
      
      '.TabIcon': {
        fill: '#9ca3af',
        transition: 'fill 0.15s ease',
      },
      
      '.Tab--selected .TabIcon': {
        fill: '#4f46e5',
      },
      
      // Block-level elements
      '.Block': {
        backgroundColor: 'transparent',
        border: 'none',
        padding: '0',
      },
      
      // Checkbox styling
      '.Checkbox': {
        borderColor: '#d1d5db',
        borderRadius: '4px',
        transition: 'all 0.15s ease',
      },
      
      '.Checkbox:hover': {
        borderColor: '#4f46e5',
      },
      
      '.Checkbox--checked': {
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5',
      },
      
      // Terms acceptance
      '.TermsText': {
        fontSize: '12px',
        color: '#6b7280',
        lineHeight: '1.4',
      },
      
      '.TermsText a': {
        color: '#4f46e5',
        textDecoration: 'none',
      },
      
      '.TermsText a:hover': {
        textDecoration: 'underline',
      }
    }
  }
}

/**
 * Mobile-optimized Stripe theme with larger touch targets
 */
export const createMobileStripeTheme = (): StripeElementsOptions['appearance'] => {
  const baseTheme = createStripeTheme()!
  
  return {
    ...baseTheme,
    variables: {
      ...baseTheme.variables,
      fontSizeBase: '16px', // Prevent zoom on iOS
      spacingUnit: '6px',
    },
    rules: {
      ...baseTheme.rules,
      '.Input': {
        ...baseTheme.rules?.['.Input'],
        padding: '16px 18px',
        fontSize: '16px',
        minHeight: '48px',
      },
      '.Tab': {
        ...baseTheme.rules?.['.Tab'],
        padding: '24px',
      }
    }
  }
}

/**
 * Options for Stripe Elements with custom theme
 */
export const getStripeElementsOptions = (isMobile: boolean = false): StripeElementsOptions => {
  return {
    appearance: isMobile ? createMobileStripeTheme() : createStripeTheme(),
    loader: 'auto',
    fonts: [
      {
        family: 'DM Sans',
        src: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap',
      }
    ]
  }
}