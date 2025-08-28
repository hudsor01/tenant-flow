import { 
  defineConfig, 
  presetUno, 
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWebFonts,
  transformerVariantGroup,
  transformerCompileClass
} from 'unocss'

export default defineConfig({
  // Native UnoCSS Presets - using all built-in functionality
  presets: [
    // Core utilities - Tailwind/Windi CSS compatible
    presetUno({
      dark: 'class' // Native dark mode support
    }),
    
    // Attributify mode - write utilities as attributes
    // Example: <div text="sm white" bg="blue-500" />
    presetAttributify({
      prefix: 'un-', // Optional prefix to avoid conflicts
      prefixedOnly: false // Allow both prefixed and unprefixed
    }),
    
    // Icons preset - any icon as a CSS class
    presetIcons({
      scale: 1.2, // Slightly larger icons by default
      cdn: 'https://esm.sh/' // Use CDN for icon sets
    }),
    
    // Typography preset - beautiful prose styles
    presetTypography(),
    
    // Web fonts - load fonts on demand
    presetWebFonts({
      provider: 'google',
      fonts: {
        sans: 'Inter:400,500,600,700',
        mono: 'Fira Code:400,500'
      }
    })
  ],

  // Native Transformers - webpack-compatible only
  transformers: [
    // Group variants - hover:(bg-blue-500 text-white)
    transformerVariantGroup(),
    
    // Compile multiple classes into one at build time
    transformerCompileClass()
  ],

  // Native CSS Layers for cascade management
  layers: {
    'base': 0,
    'components': 1,
    'utilities': 2,
  },

  // Container queries - component-level responsive design
  theme: {
    // Container sizes for @container queries
    containers: {
      xs: '20rem',
      sm: '24rem',
      md: '28rem',
      lg: '32rem',
      xl: '36rem',
      '2xl': '42rem'
    },
    
    // Extend or override default theme
    colors: {
      // Brand colors
      brand: {
        50: '#f0f9ff',
        100: '#e0f2fe',
        200: '#bae6fd',
        300: '#7dd3fc',
        400: '#38bdf8',
        500: '#0ea5e9',
        600: '#0284c7',
        700: '#0369a1',
        800: '#075985',
        900: '#0c4a6e',
        950: '#082f49'
      }
    },
    
    // Animation durations for transitions
    duration: {
      fast: '150ms',
      base: '200ms',
      slow: '300ms',
      slower: '500ms'
    }
  },

  // Native shortcuts - component classes without abstractions
  shortcuts: [
    // Dynamic shortcuts with regex matching
    [/^btn-(.*)$/, ([, c]) => `px-4 py-2 rounded-lg bg-${c}-500 text-white hover:bg-${c}-600 transition-colors`],
    
    // Static shortcuts for common patterns
    {
      // Layout utilities
      'container-responsive': '@container-sm:p-4 @container-md:p-6 @container-lg:p-8',
      'stack': 'flex flex-col gap-4',
      'hstack': 'flex items-center gap-4',
      'center': 'flex items-center justify-center',
      
      // Form elements - native HTML styling
      'input-base': 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500',
      'label-base': 'block text-sm font-medium text-gray-700 mb-1',
      
      // Cards with native CSS features
      'card': 'bg-white rounded-lg shadow-sm border border-gray-200 @container',
      'card-hover': 'card hover:shadow-md transition-shadow',
      
      // Buttons using CSS layers
      'btn': 'inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'btn-primary': 'btn bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-500',
      'btn-secondary': 'btn bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-500',
      'btn-ghost': 'btn text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-500',

      // === DRY SHORTCUTS FOR REPEATED PATTERNS ===
      
      // Icon patterns (40+ instances identified)
      'icon-sm': 'h-3 w-3 flex-shrink-0',
      'icon-md': 'h-4 w-4 flex-shrink-0',
      'icon-lg': 'h-5 w-5 flex-shrink-0',
      'icon-xl': 'h-6 w-6 flex-shrink-0',
      'icon-sm-primary': 'icon-sm text-primary',
      'icon-sm-muted': 'icon-sm text-muted-foreground',
      'icon-md-primary': 'icon-md text-primary',
      'icon-md-muted': 'icon-md text-muted-foreground',
      'icon-lg-primary': 'icon-lg text-primary',
      'icon-lg-muted': 'icon-lg text-muted-foreground',
      
      // Layout containers (20+ instances)
      'icon-container': 'bg-primary/10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded',
      'icon-container-sm': 'bg-primary/10 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded',
      'icon-container-lg': 'bg-primary/10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded',
      'info-bar': 'bg-muted flex items-center justify-between rounded-md px-3 py-2 text-sm',
      'info-bar-primary': 'bg-primary/10 flex items-center justify-between rounded-md px-3 py-2 text-sm',
      
      // Status colors (30+ instances)
      'status-success': 'border-green-200 bg-green-50 text-green-800',
      'status-error': 'border-red-200 bg-red-50 text-red-800',
      'status-warning': 'border-yellow-200 bg-yellow-50 text-yellow-800',
      'status-info': 'border-blue-200 bg-blue-50 text-blue-800',
      'status-neutral': 'border-gray-200 bg-gray-50 text-gray-800',
      
      // Interactive states (25+ instances)  
      'interactive-primary': 'bg-blue-600 text-white hover:bg-blue-700 transition-colors',
      'interactive-secondary': 'bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors',
      'interactive-ghost': 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors',
      'interactive-muted': 'text-muted-foreground hover:text-foreground transition-colors',
      
      // Spacing patterns (40+ instances)
      'pad-sm': 'px-2 py-1',
      'pad-md': 'px-4 py-2', 
      'pad-lg': 'px-6 py-3',
      'pad-xl': 'px-8 py-4',
      'gap-sm': 'gap-2',
      'gap-md': 'gap-4',
      'gap-lg': 'gap-6',
      
      // Transitions (15+ instances)
      'transition-default': 'transition-all duration-200',
      'transition-colors': 'transition-colors duration-200',
      'transition-transform': 'transition-transform duration-200',
      'hover-lift': 'hover:shadow-md transition-shadow duration-200',
      'hover-scale': 'hover:scale-105 transition-transform duration-200',
      
      // State-based coloring (10+ instances)
      'status-indicator-online': 'h-2 w-2 rounded-full bg-green-500',
      'status-indicator-offline': 'h-2 w-2 rounded-full bg-gray-400',
      'text-positive': 'text-green-600',
      'text-negative': 'text-red-600',
      'text-conditional': 'text-muted-foreground',
      
      // Form validation states - Data-driven (15+ instances) 
      'form-field': 'border-gray-300 data-[error=true]:border-red-500 data-[valid=true]:border-green-500',
      'form-input': 'input-base data-[error=true]:input-error data-[loading=true]:opacity-50',
      'required-asterisk': "after:content-['*'] after:ml-1 after:text-red-500",
      
      // Interactive states - Data-driven (20+ instances)
      'interactive-button': 'btn data-[active=true]:btn-primary data-[loading=true]:opacity-50',
      'interactive-card': 'card data-[selected=true]:ring-2 data-[selected=true]:ring-blue-500',
      'interactive-row': 'p-2 data-[active=true]:bg-blue-50 data-[hover=true]:bg-gray-50',
      'highlight-text': 'text-muted-foreground data-[active=true]:text-primary',
      'status-indicator': 'h-2 w-2 rounded-full bg-gray-400 data-[online=true]:bg-green-500',
      
      // Table patterns - Pure CSS (eliminates JavaScript)
      'table-striped': 'border-b border-gray-100 even:bg-white odd:bg-gray-50/30',
      'list-striped': 'even:bg-gray-50 odd:bg-white',
      
      // Loading & Animation states - Data-driven
      'loading-spinner': 'animate-spin data-[loading=false]:hidden',
      'loading-button': 'btn data-[loading=true]:opacity-50 data-[loading=true]:cursor-not-allowed',
      'fade-content': 'transition-opacity data-[loading=true]:opacity-50',
      'bounce-element': 'data-[animate=true]:animate-bounce',
      
      // Multi-state patterns - Semantic class composition
      'badge-success': 'px-2 py-1 rounded text-sm bg-green-500 text-white',
      'badge-error': 'px-2 py-1 rounded text-sm bg-red-500 text-white', 
      'badge-warning': 'px-2 py-1 rounded text-sm bg-yellow-500 text-black',
      'badge-info': 'px-2 py-1 rounded text-sm bg-blue-500 text-white',
      
      // Navigation variants - Eliminate variant ternaries
      'tab-container': 'flex',
      'tab-pills': 'tab-container space-x-1',
      'tab-default': 'tab-container space-x-0',
      'nav-sidebar': 'navigation-base sidebar-layout',
      'nav-minimal': 'navigation-base minimal-layout',
      
      // Component size variants
      'size-sm': 'text-sm px-2 py-1',
      'size-md': 'text-base px-3 py-2', 
      'size-lg': 'text-lg px-4 py-3',
      
      // Icon size variants by context
      'icon-nav-sidebar': 'shrink-0 h-5 w-5',
      'icon-nav-default': 'shrink-0 h-4 w-4',
      
      // Sidebar toggle variants - eliminate nested ternaries
      'sidebar-toggle-minimal': 'flex items-center justify-center',
      'sidebar-toggle-expanded': 'flex items-center justify-center',
      'sidebar-toggle-collapsed': 'flex items-center justify-center'
    }
  ],

  // Native rules - custom CSS generation
  rules: [
    // Container query support
    ['container-type', { 'container-type': 'inline-size' }],
    ['container-name', { 'container-name': 'card' }],
    
    // Fluid typography using clamp()
    [/^text-fluid-(.+)$/, ([, d]) => {
      const sizes: Record<string, string> = {
        'sm': 'clamp(0.875rem, 2vw, 1rem)',
        'base': 'clamp(1rem, 2.5vw, 1.125rem)',
        'lg': 'clamp(1.125rem, 3vw, 1.25rem)',
        'xl': 'clamp(1.25rem, 3.5vw, 1.5rem)',
        '2xl': 'clamp(1.5rem, 4vw, 1.875rem)',
        '3xl': 'clamp(1.875rem, 5vw, 2.25rem)'
      }
      return d && sizes[d] ? { 'font-size': sizes[d] } : {}
    }],
    
    // Aspect ratios using native CSS
    [/^aspect-(.+)$/, ([, d]) => d ? { 'aspect-ratio': d.replace('-', '/') } : {}],
    
    // CSS Grid utilities
    [/^grid-auto-(.+)$/, ([, d]) => d ? { 'grid-auto-columns': d } : {}],
    
    // Native scroll snap
    [/^snap-(.+)$/, ([, d]) => {
      const snaps: Record<string, string> = {
        'start': 'start',
        'center': 'center',
        'end': 'end',
        'align-start': 'align-start',
        'align-center': 'align-center',
        'align-end': 'align-end'
      }
      return d && snaps[d] ? { 'scroll-snap-align': snaps[d] } : {}
    }]
  ],

  // Variants - conditional styling
  variants: [
    // Container query variants
    {
      name: 'container',
      match(matcher) {
        if (!matcher.startsWith('container-'))
          return
        const size = matcher.slice(10)
        return {
          matcher: matcher.slice(10 + size.length + 1),
          selector: s => `@container ${size} (min-width: var(--un-container-${size})) { ${s} }`
        }
      }
    },
    
    // CSS layer variants
    {
      name: 'layer',
      match(matcher) {
        if (!matcher.startsWith('layer-'))
          return
        const layer = matcher.slice(6)
        return {
          matcher: matcher.slice(6 + layer.length + 1),
          selector: s => `@layer ${layer} { ${s} }`
        }
      }
    },
    
    // Print variant using proper UnoCSS variant API
    {
      name: 'print',
      match(matcher) {
        if (matcher === 'print') {
          return {
            matcher: '',
            selector: (s) => `@media print { ${s} }`
          }
        }
        return undefined
      }
    }
  ],

  // Safelist - always include these classes
  safelist: [
    'dark',
    ...['blue', 'green', 'red', 'orange'].map(color => `text-${color}-500`),
    ...['sm', 'base', 'lg', 'xl', '2xl'].map(size => `text-${size}`),
    // Icons used dynamically in components
    'i-lucide-calendar',
    'i-lucide-phone',
    'i-lucide-mail',
    'i-lucide-check-circle',
    'i-lucide-clock',
    'i-lucide-trending-up',
    'i-lucide-users',
    'i-lucide-dollar-sign',
    'i-lucide-shield',
    'i-lucide-bell',
    'i-lucide-home',
    'i-lucide-sparkles'
  ],

  // Blocklist - never generate these classes
  blocklist: [
    'container' // Use our custom container-responsive instead
  ],

  // Preflights - global CSS resets (using native CSS)
  preflights: [
    {
      getCSS: () => `
        /* Native CSS Variables */
        :root {
          /* Container sizes */
          --un-container-xs: 20rem;
          --un-container-sm: 24rem;
          --un-container-md: 28rem;
          --un-container-lg: 32rem;
          --un-container-xl: 36rem;
          --un-container-2xl: 42rem;
          
          /* Native color-scheme for better dark mode */
          color-scheme: light dark;
        }
        
        /* Native CSS Layers */
        @layer base, components, utilities;
        
        /* Base layer - resets and defaults */
        @layer base {
          *,
          *::before,
          *::after {
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            font-family: var(--un-font-sans);
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          /* Native smooth scrolling */
          @media (prefers-reduced-motion: no-preference) {
            html {
              scroll-behavior: smooth;
            }
          }
        }
        
        /* Components layer - reusable patterns */
        @layer components {
          /* Container queries setup */
          .container-card {
            container-type: inline-size;
            container-name: card;
          }
          
          .container-sidebar {
            container-type: inline-size;
            container-name: sidebar;
          }
          
          .container-content {
            container-type: inline-size;
            container-name: content;
          }
        }
        
        /* Utilities layer - single-purpose classes */
        @layer utilities {
          /* Native CSS features that UnoCSS might not cover */
          .text-balance {
            text-wrap: balance;
          }
          
          .text-pretty {
            text-wrap: pretty;
          }
          
          /* Scroll snap containers */
          .snap-x {
            scroll-snap-type: x mandatory;
          }
          
          .snap-y {
            scroll-snap-type: y mandatory;
          }
        }
      `
    }
  ]
})