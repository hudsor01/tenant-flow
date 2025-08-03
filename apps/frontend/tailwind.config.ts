import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      /* === COLORS === */
      /* Professional property management color system */
      colors: {
        /* Core Brand Colors */
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          200: 'var(--color-primary-200)',
          300: 'var(--color-primary-300)',
          400: 'var(--color-primary-400)',
          500: 'var(--color-primary-500)',
          600: 'var(--color-primary-600)',
          700: 'var(--color-primary-700)',
          800: 'var(--color-primary-800)',
          900: 'var(--color-primary-900)',
          950: 'var(--color-primary-950)',
        },
        secondary: {
          50: 'var(--color-secondary-50)',
          100: 'var(--color-secondary-100)',
          200: 'var(--color-secondary-200)',
          300: 'var(--color-secondary-300)',
          400: 'var(--color-secondary-400)',
          500: 'var(--color-secondary-500)',
          600: 'var(--color-secondary-600)',
          700: 'var(--color-secondary-700)',
          800: 'var(--color-secondary-800)',
          900: 'var(--color-secondary-900)',
          950: 'var(--color-secondary-950)',
        },
        accent: {
          50: 'var(--color-accent-50)',
          100: 'var(--color-accent-100)',
          200: 'var(--color-accent-200)',
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          700: 'var(--color-accent-700)',
          800: 'var(--color-accent-800)',
          900: 'var(--color-accent-900)',
          950: 'var(--color-accent-950)',
        },
        tertiary: {
          50: 'var(--color-tertiary-50)',
          100: 'var(--color-tertiary-100)',
          200: 'var(--color-tertiary-200)',
          300: 'var(--color-tertiary-300)',
          400: 'var(--color-tertiary-400)',
          500: 'var(--color-tertiary-500)',
          600: 'var(--color-tertiary-600)',
          700: 'var(--color-tertiary-700)',
          800: 'var(--color-tertiary-800)',
          900: 'var(--color-tertiary-900)',
          950: 'var(--color-tertiary-950)',
        },

        /* Semantic Colors */
        success: {
          50: 'var(--color-success-50)',
          500: 'var(--color-success-500)',
          600: 'var(--color-success-600)',
          700: 'var(--color-success-700)',
        },
        warning: {
          50: 'var(--color-warning-50)',
          500: 'var(--color-warning-500)',
          600: 'var(--color-warning-600)',
          700: 'var(--color-warning-700)',
        },
        error: {
          50: 'var(--color-error-50)',
          500: 'var(--color-error-500)',
          600: 'var(--color-error-600)',
          700: 'var(--color-error-700)',
        },
        info: {
          50: 'var(--color-info-50)',
          500: 'var(--color-info-500)',
          600: 'var(--color-info-600)',
          700: 'var(--color-info-700)',
        },

        /* Property Management Specific Colors */
        revenue: 'var(--color-revenue)',
        expense: 'var(--color-expense)',
        profit: 'var(--color-profit)',
        occupied: 'var(--color-occupied)',
        vacant: 'var(--color-vacant)',
        maintenance: 'var(--color-maintenance)',
        emergency: 'var(--color-emergency)',
        'high-priority': 'var(--color-high-priority)',
        routine: 'var(--color-routine)',

        /* Enhanced Grays */
        gray: {
          50: 'var(--color-gray-50)',
          100: 'var(--color-gray-100)',
          200: 'var(--color-gray-200)',
          300: 'var(--color-gray-300)',
          400: 'var(--color-gray-400)',
          500: 'var(--color-gray-500)',
          600: 'var(--color-gray-600)',
          700: 'var(--color-gray-700)',
          800: 'var(--color-gray-800)',
          900: 'var(--color-gray-900)',
          950: 'var(--color-gray-950)',
        },

        /* Theme-compatible colors */
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },

      /* === TYPOGRAPHY === */
      /* Professional typography scale for property management */
      fontFamily: {
        sans: ['Inter', 'DM Sans', ...fontFamily.sans],
        display: ['Lexend', 'Inter', ...fontFamily.sans],
        mono: ['JetBrains Mono', 'SF Mono', 'Consolas', ...fontFamily.mono],
      },
      fontSize: {
        'xs': ['var(--text-xs)', { lineHeight: 'var(--leading-normal)' }],
        'sm': ['var(--text-sm)', { lineHeight: 'var(--leading-normal)' }],
        'base': ['var(--text-base)', { lineHeight: 'var(--leading-normal)' }],
        'lg': ['var(--text-lg)', { lineHeight: 'var(--leading-relaxed)' }],
        'xl': ['var(--text-xl)', { lineHeight: 'var(--leading-relaxed)' }],
        '2xl': ['var(--text-2xl)', { lineHeight: 'var(--leading-tight)' }],
        '3xl': ['var(--text-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--text-4xl)', { lineHeight: 'var(--leading-tight)' }],
        '5xl': ['var(--text-5xl)', { lineHeight: 'var(--leading-none)' }],
        '6xl': ['var(--text-6xl)', { lineHeight: 'var(--leading-none)' }],
        '7xl': ['var(--text-7xl)', { lineHeight: 'var(--leading-none)' }],
        '8xl': ['var(--text-8xl)', { lineHeight: 'var(--leading-none)' }],
        '9xl': ['var(--text-9xl)', { lineHeight: 'var(--leading-none)' }],
      },
      fontWeight: {
        thin: 'var(--font-thin)',
        extralight: 'var(--font-extralight)',
        light: 'var(--font-light)',
        normal: 'var(--font-normal)',
        medium: 'var(--font-medium)',
        semibold: 'var(--font-semibold)',
        bold: 'var(--font-bold)',
        extrabold: 'var(--font-extrabold)',
        black: 'var(--font-black)',
      },
      letterSpacing: {
        tighter: 'var(--tracking-tighter)',
        tight: 'var(--tracking-tight)',
        normal: 'var(--tracking-normal)',
        wide: 'var(--tracking-wide)',
        wider: 'var(--tracking-wider)',
        widest: 'var(--tracking-widest)',
      },

      /* === SPACING === */
      /* Mathematical progression optimized for property management UI */
      spacing: {
        '0.5': 'var(--spacing-0-5)',
        '1.5': 'var(--spacing-1-5)',
        '2.5': 'var(--spacing-2-5)',
        '3.5': 'var(--spacing-3-5)',
        '18': 'var(--spacing-72)',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '38': '9.5rem',
        '42': '10.5rem',
        '46': '11.5rem',
        '50': '12.5rem',
        '54': '13.5rem',
        '58': '14.5rem',
        '62': '15.5rem',
        '66': '16.5rem',
        '70': '17.5rem',
        '74': '18.5rem',
        '78': '19.5rem',
        '82': '20.5rem',
        '86': '21.5rem',
        '90': '22.5rem',
        '94': '23.5rem',
        '98': '24.5rem',
      },

      /* === BORDER RADIUS === */
      /* Sophisticated rounding for professional UI */
      borderRadius: {
        'none': 'var(--radius-none)',
        'sm': 'var(--radius-sm)',
        'base': 'var(--radius-base)',
        'md': 'var(--radius-md)',
        'lg': 'var(--radius-lg)',
        'xl': 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        '3xl': 'var(--radius-3xl)',
        'full': 'var(--radius-full)',
      },

      /* === SHADOWS === */
      /* Professional elevation system */
      boxShadow: {
        'xs': 'var(--shadow-xs)',
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
        'xl': 'var(--shadow-xl)',
        '2xl': 'var(--shadow-2xl)',
        'primary': 'var(--shadow-primary)',
        'accent': 'var(--shadow-accent)',
        'warning': 'var(--shadow-warning)',
        'error': 'var(--shadow-error)',
      },

      /* === ANIMATION === */
      /* Professional motion design */
      transitionDuration: {
        '75': 'var(--duration-75)',
        '100': 'var(--duration-100)',
        '150': 'var(--duration-150)',
        '200': 'var(--duration-200)',
        '300': 'var(--duration-300)',
        '500': 'var(--duration-500)',
        '700': 'var(--duration-700)',
        '1000': 'var(--duration-1000)',
      },
      transitionTimingFunction: {
        'spring': 'var(--ease-spring)',
        'bounce': 'var(--ease-bounce)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out forwards',
        'fade-in-up': 'fadeInUp 500ms ease-out forwards',
        'fade-in-down': 'fadeInDown 500ms ease-out forwards',
        'slide-in-left': 'slideInLeft 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'slide-in-right': 'slideInRight 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'zoom-in': 'zoomIn 200ms ease-out forwards',
        'pulse-soft': 'pulseSoft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'skeleton': 'skeleton 2s ease-in-out infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite',
        'revenue-counter': 'revenueCounter 1000ms ease-out forwards',
        'occupancy-fill': 'occupancyFill 700ms ease-out forwards',
        'maintenance-alert': 'maintenanceAlert 2s ease-in-out infinite',
        'progress-bar': 'progressBar 500ms ease-out forwards',
        'chart-draw': 'chartDraw 1000ms ease-out forwards',
        'bar-grow': 'barGrow 700ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        'pie-slice': 'pieSlice 500ms ease-out forwards',
        'status-success': 'statusSuccess 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'status-warning': 'statusWarning 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'status-error': 'statusError 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'button-press': 'buttonPress 150ms ease-out',
        'card-select': 'cardSelect 200ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'notification-slide': 'notificationSlide 300ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'currency-flip': 'currencyFlip 300ms ease-out',
        'trend-up': 'trendUp 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        'trend-down': 'trendDown 500ms cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      },

      /* === RESPONSIVE BREAKPOINTS === */
      /* Optimized for property management workflows */
      screens: {
        'xs': '480px',
        'sm': 'var(--screen-sm)',
        'md': 'var(--screen-md)',
        'lg': 'var(--screen-lg)',
        'xl': 'var(--screen-xl)',
        '2xl': 'var(--screen-2xl)',
        '3xl': 'var(--screen-3xl)',
      },

      /* === GRID SYSTEMS === */
      /* Layout systems for property listings and dashboards */
      gridTemplateColumns: {
        'property-cards': 'var(--grid-cols-property-cards)',
        'dashboard': 'var(--grid-cols-dashboard)',
        'responsive': 'var(--grid-cols-responsive)',
      },

      /* === Z-INDEX SCALE === */
      /* Layering for complex property management interfaces */
      zIndex: {
        '0': 'var(--z-0)',
        '10': 'var(--z-10)',
        '20': 'var(--z-20)',
        '30': 'var(--z-30)',
        '40': 'var(--z-40)',
        '50': 'var(--z-50)',
      },

      /* === BACKDROP BLUR === */
      /* Modern glass morphism effects */
      backdropBlur: {
        'xs': '2px',
        'sm': '4px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        '2xl': '24px',
        '3xl': '40px',
      },

      /* === CONTAINER QUERIES === */
      /* Component-level responsive design */
      containers: {
        'xs': 'var(--container-xs)',
        'sm': 'var(--container-sm)',
        'md': 'var(--container-md)',
        'lg': 'var(--container-lg)',
        'xl': 'var(--container-xl)',
        '2xl': 'var(--container-2xl)',
        '3xl': 'var(--container-3xl)',
        '4xl': 'var(--container-4xl)',
        '5xl': 'var(--container-5xl)',
        '6xl': 'var(--container-6xl)',
        '7xl': 'var(--container-7xl)',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    require('@tailwindcss/container-queries'),
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
} satisfies Config

export default config