/**
 * TenantFlow Design System - Unified Token System
 * Single source of truth for all design tokens, combining JSON tokens with CSS custom properties
 * Design with OKLCH color space and Spline Sans typography
 */

export const typography = {
	// Font Family
	fontFamily: {
		default: "'Spline Sans','Spline Sans', SystemFont, sans-serif",
		display: "'Spline Sans','Spline Sans', SystemFont, sans-serif",
		monospace:
			"ui-monospace, SFMono-Regular, 'SF Mono', Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace"
	},

	// Enhanced Typography Scale with better hierarchy
	fontSize: {
		// Display/Marketing sizes
		'display-2xl': '4.5rem', // 72px - Hero headlines
		'display-xl': '3.75rem', // 60px - Large hero text
		'display-lg': '3rem', // 48px - Section headers
		'display-md': '2.25rem', // 36px - Card titles
		'display-sm': '1.875rem', // 30px - Small display

		// UI Typography sizes
		'large-title': '1.625rem', // 26px - Main page titles
		'title-1': '1.375rem', // 22px - Section titles
		'title-2': '1.0625rem', // 17px - Card headers
		'title-3': '0.9375rem', // 15px - Small headers
		headline: '0.8125rem', // 13px - Emphasized body
		body: '0.8125rem', // 13px - Primary body text
		callout: '0.75rem', // 12px - Secondary text
		subheadline: '0.6875rem', // 11px - Tertiary text
		footnote: '0.625rem', // 10px - Captions
		'caption-1': '0.625rem', // 10px - Small captions
		'caption-2': '0.5625rem' // 9px - Tiny text
	},

	// Optimized Line heights for better readability
	lineHeight: {
		// Display line heights - tighter for impact
		'display-2xl': 1.1,
		'display-xl': 1.15,
		'display-lg': 1.2,
		'display-md': 1.25,
		'display-sm': 1.3,

		// UI line heights - optimized for readability
		'large-title': 1.231,
		'title-1': 1.182,
		'title-2': 1.294,
		'title-3': 1.333,
		headline: 1.231,
		body: 1.231,
		callout: 1.25,
		subheadline: 1.273,
		footnote: 1.3,
		caption: 1.3
	},

	// Letter spacing for optical precision
	letterSpacing: {
		// Display - tighter for impact
		'display-2xl': '-0.025em',
		'display-xl': '-0.02em',
		'display-lg': '-0.015em',
		'display-md': '-0.01em',
		'display-sm': '-0.005em',

		// UI - neutral to slightly loose
		'large-title': '0px',
		title: '0px',
		headline: '0px',
		body: '0px',
		subheadline: '0px',
		footnote: '0px',
		caption: '0.01em'
	},

	// Responsive Typography Scale - Mobile-first with clamp functions
	responsive: {
		// Display sizes that scale with viewport
		'display-2xl': 'clamp(2.5rem, 6vw, 4.5rem)', // Mobile: 40px, Desktop: 72px
		'display-xl': 'clamp(2.25rem, 5vw, 3.75rem)', // Mobile: 36px, Desktop: 60px
		'display-lg': 'clamp(1.875rem, 4vw, 3rem)', // Mobile: 30px, Desktop: 48px
		'display-md': 'clamp(1.5rem, 3vw, 2.25rem)', // Mobile: 24px, Desktop: 36px
		'display-sm': 'clamp(1.25rem, 2.5vw, 1.875rem)', // Mobile: 20px, Desktop: 30px

		// UI Typography with responsive scaling
		'large-title': 'clamp(1.375rem, 3vw, 1.625rem)', // Mobile: 22px, Desktop: 26px
		'title-1': 'clamp(1.125rem, 2.5vw, 1.375rem)', // Mobile: 18px, Desktop: 22px
		'title-2': 'clamp(0.9375rem, 2vw, 1.0625rem)', // Mobile: 15px, Desktop: 17px
		'title-3': 'clamp(0.8125rem, 1.5vw, 0.9375rem)', // Mobile: 13px, Desktop: 15px
		headline: 'clamp(0.75rem, 1.25vw, 0.8125rem)', // Mobile: 12px, Desktop: 13px
		body: 'clamp(0.8125rem, 1.5vw, 0.8125rem)', // Mobile: 13px, Desktop: 13px (stable)
		callout: 'clamp(0.6875rem, 1.25vw, 0.75rem)', // Mobile: 11px, Desktop: 12px
		subheadline: 'clamp(0.625rem, 1vw, 0.6875rem)', // Mobile: 10px, Desktop: 11px
		footnote: 'clamp(0.5625rem, 0.8vw, 0.625rem)', // Mobile: 9px, Desktop: 10px
		'caption-1': 'clamp(0.5625rem, 0.8vw, 0.625rem)', // Mobile: 9px, Desktop: 10px
		'caption-2': 'clamp(0.5rem, 0.7vw, 0.5625rem)' // Mobile: 8px, Desktop: 9px
	},

	// Semantic typography variants
	variants: {
		// Marketing/Branding
		marketing: {
			hero: {
				fontSize: '4.5rem',
				lineHeight: 1.1,
				fontWeight: 800,
				letterSpacing: '-0.025em'
			},
			section: {
				fontSize: '3rem',
				lineHeight: 1.2,
				fontWeight: 700,
				letterSpacing: '-0.015em'
			},
			tagline: {
				fontSize: '1.5rem',
				lineHeight: 1.4,
				fontWeight: 400,
				letterSpacing: '0.01em'
			}
		},

		// UI Components
		ui: {
			h1: {
				fontSize: '1.625rem',
				lineHeight: 1.231,
				fontWeight: 700,
				letterSpacing: '0px'
			},
			h2: {
				fontSize: '1.375rem',
				lineHeight: 1.182,
				fontWeight: 600,
				letterSpacing: '0px'
			},
			h3: {
				fontSize: '1.0625rem',
				lineHeight: 1.294,
				fontWeight: 600,
				letterSpacing: '0px'
			},
			h4: {
				fontSize: '0.9375rem',
				lineHeight: 1.333,
				fontWeight: 600,
				letterSpacing: '0px'
			},
			body: {
				fontSize: '0.8125rem',
				lineHeight: 1.231,
				fontWeight: 400,
				letterSpacing: '0px'
			},
			caption: {
				fontSize: '0.625rem',
				lineHeight: 1.3,
				fontWeight: 400,
				letterSpacing: '0.01em'
			}
		}
	}
} as const

export const colors = {
	// Primary brand colors
	primary: {
		main: 'oklch(0.623 0.214 259.815)',
		10: 'oklch(0.623 0.214 259.815 / 10%)',
		15: 'oklch(0.623 0.214 259.815 / 15%)',
		25: 'oklch(0.623 0.214 259.815 / 25%)',
		40: 'oklch(0.623 0.214 259.815 / 40%)',
		50: 'oklch(0.623 0.214 259.815 / 50%)',
		85: 'oklch(0.623 0.214 259.815 / 85%)'
	},

	// System colors
	system: {
		red: 'oklch(0.534 0.183 27.353)',
		'red-10': 'oklch(0.534 0.183 27.353 / 10%)',
		'red-15': 'oklch(0.534 0.183 27.353 / 15%)',
		'red-25': 'oklch(0.534 0.183 27.353 / 25%)',
		'red-50': 'oklch(0.534 0.183 27.353 / 50%)',
		'red-85': 'oklch(0.534 0.183 27.353 / 85%)',

		green: 'oklch(0.648 0.159 145.382)',
		'green-10': 'oklch(0.648 0.159 145.382 / 10%)',
		'green-15': 'oklch(0.648 0.159 145.382 / 15%)',
		'green-25': 'oklch(0.648 0.159 145.382 / 25%)',
		'green-50': 'oklch(0.648 0.159 145.382 / 50%)',
		'green-85': 'oklch(0.648 0.159 145.382 / 85%)',

		blue: 'oklch(0.607 0.213 258.623)',
		'blue-10': 'oklch(0.607 0.213 258.623 / 10%)',
		'blue-15': 'oklch(0.607 0.213 258.623 / 15%)',
		'blue-25': 'oklch(0.607 0.213 258.623 / 25%)',
		'blue-50': 'oklch(0.607 0.213 258.623 / 50%)',
		'blue-85': 'oklch(0.607 0.213 258.623 / 85%)',

		orange: 'oklch(0.646 0.222 41.116)',
		yellow: 'oklch(0.826 0.211 85.342)',
		mint: 'oklch(0.699 0.136 180.472)'
	},

	// Label colors (text hierarchy)
	label: {
		primary: 'oklch(0 0 0 / 85%)',
		secondary: 'oklch(0 0 0 / 50%)',
		tertiary: 'oklch(0 0 0 / 25%)',
		quaternary: 'oklch(0 0 0 / 10%)',
		quinary: 'oklch(0 0 0 / 5%)',
		seximal: 'oklch(0 0 0 / 3%)'
	},

	// Fill colors (background hierarchy)
	fill: {
		primary: 'oklch(0 0 0 / 10%)',
		secondary: 'oklch(0 0 0 / 8%)',
		tertiary: 'oklch(0 0 0 / 5%)',
		quaternary: 'oklch(0 0 0 / 3%)',
		quinary: 'oklch(0 0 0 / 2%)'
	},

	// Gray system
	gray: {
		primary: 'oklch(0 0 0)',
		secondary: 'oklch(0.62 0 0)',
		tertiary: 'oklch(1 0 0)'
	},

	// Separator
	separator: 'oklch(0.31 0 0 / 29%)',

	// Semantic colors for status and feedback
	semantic: {
		success: {
			main: 'oklch(0.648 0.159 145.382)', // Same as system.green
			light: 'oklch(0.648 0.159 145.382 / 10%)',
			dark: 'oklch(0.648 0.159 145.382 / 85%)',
			foreground: 'oklch(0.2 0.02 160)'
		},
		warning: {
			main: 'oklch(0.826 0.211 85.342)', // Same as system.yellow
			light: 'oklch(0.826 0.211 85.342 / 10%)',
			dark: 'oklch(0.826 0.211 85.342 / 15%)',
			foreground: 'oklch(0.25 0.03 85)'
		},
		error: {
			main: 'oklch(0.534 0.183 27.353)', // Same as system.red
			light: 'oklch(0.534 0.183 27.353 / 10%)',
			dark: 'oklch(0.534 0.183 27.353 / 85%)',
			foreground: 'oklch(0.98 0.01 90)'
		},
		destructive: {
			main: 'oklch(0.577 0.245 25)', // Slightly different red for destructive actions
			light: 'oklch(0.577 0.245 25 / 10%)',
			dark: 'oklch(0.577 0.245 25 / 85%)',
			foreground: 'oklch(0.98 0.01 90)'
		},
		info: {
			main: 'oklch(0.607 0.213 258.623)', // Same as system.blue
			light: 'oklch(0.607 0.213 258.623 / 10%)',
			dark: 'oklch(0.607 0.213 258.623 / 85%)',
			foreground: 'oklch(0.18 0.02 240)'
		}
	},

	// Dark mode overrides
	dark: {
		label: {
			primary: 'oklch(1 0 0)',
			secondary: 'oklch(1 0 0 / 55%)',
			tertiary: 'oklch(1 0 0 / 25%)',
			quaternary: 'oklch(1 0 0 / 10%)',
			quinary: 'oklch(1 0 0 / 5%)',
			seximal: 'oklch(1 0 0 / 3%)'
		},
		fill: {
			primary: 'oklch(1 0 0 / 10%)',
			secondary: 'oklch(1 0 0 / 8%)',
			tertiary: 'oklch(1 0 0 / 5%)',
			quaternary: 'oklch(1 0 0 / 3%)',
			quinary: 'oklch(1 0 0 / 2%)'
		}
	}
} as const

// ============================================================================
// SPACING & LAYOUT TOKENS
// ============================================================================

export const spacing = {
	0: '0',
	px: '1px',
	0.5: '0.125rem',
	1: '0.25rem',
	1.5: '0.375rem',
	2: '0.5rem',
	2.5: '0.625rem',
	3: '0.75rem',
	3.5: '0.875rem',
	4: '1rem',
	5: '1.25rem',
	6: '1.5rem',
	7: '1.75rem',
	8: '2rem',
	9: '2.25rem',
	10: '2.5rem',
	11: '2.75rem',
	12: '3rem',
	14: '3.5rem',
	16: '4rem',
	20: '5rem',
	24: '6rem',
	28: '7rem',
	32: '8rem',
	36: '9rem',
	40: '10rem',
	44: '11rem',
	48: '12rem',
	52: '13rem',
	56: '14rem',
	60: '15rem',
	64: '16rem',
	72: '18rem',
	80: '20rem',
	96: '24rem'
} as const

// ============================================================================
// SEMANTIC LAYOUT TOKENS - Purpose-driven spacing for consistent layouts
// ============================================================================

export const layout = {
	// Section Spacing - Vertical padding for page sections
	section: {
		paddingY: '5rem', // spacing.20 - Default section vertical spacing
		paddingYCompact: '3rem', // spacing.12 - Compact sections (cards, modals)
		paddingYSpacious: '6rem', // spacing.24 - Hero sections, landing pages
		paddingYHero: '8rem' // spacing.32 - Large hero sections
	},

	// Container Spacing - Horizontal padding for content containers
	container: {
		paddingX: 'clamp(1.5rem, 4vw, 3rem)', // Responsive container horizontal padding
		paddingXNarrow: 'clamp(1rem, 2vw, 1.5rem)', // Tight horizontal padding
		paddingXWide: 'clamp(2rem, 6vw, 4rem)', // Wide horizontal padding
		maxWidth: '80rem' // Maximum container width
	},

	// Content Block Spacing - Padding for content areas
	content: {
		padding: '2rem', // spacing.8 - Standard content block padding
		paddingCompact: '1rem', // spacing.4 - Compact content padding
		paddingSpacious: '3rem', // spacing.12 - Spacious content padding
		paddingHero: '4rem' // spacing.16 - Hero content padding
	},

	// Component Gap Spacing - Gaps between elements
	gap: {
		section: '4rem', // spacing.16 - Gap between major sections
		group: '2rem', // spacing.8 - Gap between related groups
		items: '1rem', // spacing.4 - Gap between individual items
		tight: '0.5rem', // spacing.2 - Tight gaps
		loose: '3rem' // spacing.12 - Loose gaps
	},

	// Stack Spacing - Vertical rhythm in stacked layouts
	stack: {
		tight: '0.75rem', // spacing.3 - Tight vertical rhythm
		default: '1.5rem', // spacing.6 - Default vertical rhythm
		loose: '3rem', // spacing.12 - Loose vertical rhythm
		spacious: '4rem' // spacing.16 - Spacious vertical rhythm
	},

	// Responsive Breakpoints - Mobile-first spacing utilities
	responsive: {
		// Mobile-first spacing scale with clamp functions
		xs: 'clamp(0.25rem, 1vw, 0.5rem)', // Extra small: Mobile 4px, Desktop 8px
		sm: 'clamp(0.375rem, 1.5vw, 0.75rem)', // Small: Mobile 6px, Desktop 12px
		md: 'clamp(0.5rem, 2vw, 1rem)', // Medium: Mobile 8px, Desktop 16px
		lg: 'clamp(0.75rem, 3vw, 1.5rem)', // Large: Mobile 12px, Desktop 24px
		xl: 'clamp(1rem, 4vw, 2rem)', // Extra large: Mobile 16px, Desktop 32px
		'2xl': 'clamp(1.5rem, 6vw, 3rem)', // 2X large: Mobile 24px, Desktop 48px

		// Touch-friendly sizing (minimum 44px touch targets)
		touch: {
			minHeight: '2.75rem', // 44px minimum touch target
			minWidth: '2.75rem', // 44px minimum touch target
			padding: 'clamp(0.75rem, 2vw, 1rem)', // Touch-friendly padding
			gap: 'clamp(0.5rem, 1.5vw, 0.75rem)' // Touch-friendly gaps
		},

		// Container padding that scales with viewport
		containerPadding: 'clamp(1rem, 4vw, 2rem)',
		containerPaddingNarrow: 'clamp(0.75rem, 2vw, 1.5rem)',
		containerPaddingWide: 'clamp(1.5rem, 6vw, 3rem)',

		// Section spacing that adapts to screen size
		sectionSpacing: 'clamp(2rem, 8vh, 6rem)',
		sectionSpacingCompact: 'clamp(1.5rem, 6vh, 4rem)',
		sectionSpacingSpacious: 'clamp(3rem, 12vh, 8rem)',

		// Mobile-specific spacing
		mobile: {
			containerPadding: '1rem', // Fixed padding on mobile
			sectionSpacing: '2rem', // Fixed section spacing on mobile
			gap: '1rem', // Consistent gap on mobile
			margin: '1rem' // Consistent margins on mobile
		},

		// Progressive enhancement breakpoints
		breakpoints: {
			sm: '640px', // Small devices
			md: '768px', // Medium devices (tablets)
			lg: '1024px', // Large devices (desktops)
			xl: '1280px', // Extra large devices
			'2xl': '1536px' // 2X large devices
		}
	}
} as const

// ============================================================================
// BORDER RADIUS TOKENS
// ============================================================================

export const radius = {
	small: '8px',
	medium: '12px',
	large: '16px',
	xlarge: '20px',
	xxlarge: '28px',
	full: '9999px'
} as const

// ============================================================================
// MOBILE-FIRST RESPONSIVE DESIGN TOKENS
// ============================================================================

export const responsive = {
	// Breakpoints - Mobile-first approach
	breakpoints: {
		sm: '640px', // Small devices (landscape phones)
		md: '768px', // Medium devices (tablets)
		lg: '1024px', // Large devices (desktops)
		xl: '1280px', // Extra large devices
		'2xl': '1536px' // 2X large devices
	},

	// Typography that scales with viewport
	typography: {
		// Fluid typography scale using clamp()
		display: {
			'2xl': 'clamp(2.5rem, 6vw, 4.5rem)', // Hero text
			xl: 'clamp(2.25rem, 5vw, 3.75rem)', // Large headings
			lg: 'clamp(1.875rem, 4vw, 3rem)', // Section headings
			md: 'clamp(1.5rem, 3vw, 2.25rem)', // Card titles
			sm: 'clamp(1.25rem, 2.5vw, 1.875rem)' // Small headings
		},
		ui: {
			h1: 'clamp(1.375rem, 3vw, 1.625rem)', // Page titles
			h2: 'clamp(1.125rem, 2.5vw, 1.375rem)', // Section titles
			h3: 'clamp(0.9375rem, 2vw, 1.0625rem)', // Component titles
			h4: 'clamp(0.8125rem, 1.5vw, 0.9375rem)', // Sub-component titles
			body: 'clamp(0.8125rem, 1.5vw, 0.8125rem)', // Body text (stable)
			caption: 'clamp(0.5625rem, 0.8vw, 0.625rem)' // Captions
		}
	},

	// Touch-friendly sizing (44px minimum touch targets)
	touch: {
		minTarget: '2.75rem', // 44px minimum touch target
		minButton: '2.75rem', // 44px minimum button size
		padding: 'clamp(0.75rem, 2vw, 1rem)', // Touch-friendly padding
		gap: 'clamp(0.5rem, 1.5vw, 0.75rem)', // Touch-friendly gaps
		borderRadius: '0.5rem' // Rounded corners for touch
	},

	// Mobile-specific layout patterns
	mobile: {
		// Single column layout
		container: {
			padding: '1rem', // Fixed padding on mobile
			maxWidth: '100%', // Full width on mobile
			margin: '0 auto' // Center container
		},

		// Stacked layout patterns
		stack: {
			gap: '1rem', // Consistent gap between stacked items
			padding: '1rem', // Consistent padding
			margin: '0.5rem 0' // Vertical margins
		},

		// Card layouts for mobile
		cards: {
			padding: '1rem', // Card internal padding
			margin: '0.5rem 0', // Card margins
			borderRadius: '0.75rem', // Rounded cards
			shadow: '0 2px 8px rgba(0, 0, 0, 0.1)' // Subtle shadow
		},

		// Navigation patterns
		nav: {
			height: '3.5rem', // Fixed nav height
			padding: '0 1rem', // Nav padding
			borderBottom: '1px solid rgba(0, 0, 0, 0.1)' // Nav separator
		}
	},

	// Progressive enhancement utilities
	enhancement: {
		// Hover states (desktop only)
		hover: {
			scale: 'scale(1.02)', // Subtle scale on hover
			shadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // Enhanced shadow
			transition: 'all 0.2s ease' // Smooth transitions
		},

		// Focus states (accessibility)
		focus: {
			ring: '2px solid oklch(0.623 0.214 259.815)', // Focus ring color
			ringOffset: '2px', // Focus ring offset
			outline: 'none' // Remove default outline
		},

		// Reduced motion preferences
		reducedMotion: {
			transition: 'none', // Disable transitions
			animation: 'none', // Disable animations
			transform: 'none' // Disable transforms
		}
	},

	// Grid systems that adapt to screen size
	grid: {
		// Auto-fit grids that respond to container size
		autoFit: {
			minWidth: '280px', // Minimum card width
			gap: 'clamp(1rem, 2vw, 1.5rem)', // Responsive gap
			padding: 'clamp(1rem, 3vw, 2rem)' // Responsive padding
		},

		// Sidebar-aware layouts
		sidebar: {
			contentMaxWidth: '1200px', // Maximum content width
			sidebarWidth: '16rem', // Sidebar width
			sidebarWidthMobile: '18rem', // Mobile sidebar width
			transition: 'all 0.3s ease' // Smooth transitions
		}
	}
} as const

export const shadows = {
	small:
		'0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px rgba(26, 26, 26, 1), 1px 1px 2px rgba(26, 26, 26, 1), 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
	medium:
		'0px 0px 25px rgba(0, 0, 0, 0.16), 0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px rgba(26, 26, 26, 1), 1px 1px 2px rgba(26, 26, 26, 1), 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
	large:
		'0px 8px 32px rgba(0, 0, 0, 0.24), 0px 2px 8px rgba(0, 0, 0, 0.16), 0px 0px 2px rgba(0, 0, 0, 0.1)',

	// Premium shadow variants
	premium: {
		sm: '0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 3px rgba(0, 0, 0, 0.08)',
		md: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
		lg: '0 24px 64px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
		xl: '0 40px 80px rgba(0, 0, 0, 0.2), 0 16px 32px rgba(0, 0, 0, 0.15)'
	}
} as const

// ============================================================================
// ANIMATION TOKENS
// ============================================================================

export const animation = {
	duration: {
		quick: '200ms',
		standard: '300ms',
		slow: '500ms',
		75: '75ms',
		100: '100ms',
		150: '150ms',
		200: '200ms',
		300: '300ms',
		500: '500ms',
		700: '700ms',
		1000: '1000ms'
	},

	easing: {
		smooth: 'cubic-bezier(0.42, 0, 0.58, 1)',
		outSmooth: 'cubic-bezier(0, 0, 0.58, 1)',
		inSmooth: 'cubic-bezier(0.42, 0, 1, 1)',
		linear: 'linear',
		in: 'cubic-bezier(0.4, 0, 1, 1)',
		out: 'cubic-bezier(0, 0, 0.2, 1)',
		inOut: 'cubic-bezier(0.4, 0, 0.2, 1)'
	}
} as const

// ============================================================================
// GLASS MORPHISM TOKENS
// ============================================================================

export const glass = {
	material:
		'linear-gradient(135deg, oklch(1 0 0 / 70%) 0%, oklch(0.985 0 0) 100%)',
	border: '0.5px solid rgba(0, 0, 0, 0.1)',
	shadow:
		'0px 0px 25px rgba(0, 0, 0, 0.16), 0px 0px 8px 1px rgba(0, 0, 0, 0.2), -1px -1px 2px oklch(0.2 0 0), 1px 1px 2px oklch(0.2 0 0), 2px 2px 0.25px -1.5px rgba(255, 255, 255, 0.7), 0px 0px 2px rgba(0, 0, 0, 0.1)',
	blur: '12px',

	// Glass variants
	bg: 'rgba(255, 255, 255, 0.1)',
	borderColor: 'rgba(255, 255, 255, 0.2)',
	strong: {
		bg: 'rgba(255, 255, 255, 0.15)',
		blur: '20px',
		border: 'rgba(255, 255, 255, 0.3)'
	}
} as const

// ============================================================================
// BUTTON STATE TOKENS
// ============================================================================

export const buttons = {
	primary: {
		idle: 'linear-gradient(135deg, oklch(0.623 0.214 259.815 / 50%) 0%, oklch(0.623 0.214 259.815 / 50%) 50%, oklch(0.623 0.214 259.815) 100%)',
		hover:
			'linear-gradient(135deg, oklch(0.623 0.214 259.815 / 85%) 0%, oklch(0.623 0.214 259.815 / 85%) 50%, oklch(0.623 0.214 259.815) 100%)'
	},
	secondary: {
		idle: 'rgba(0, 0, 0, 0.05)',
		hover: 'rgba(0, 0, 0, 0.1)'
	}
} as const

// ============================================================================
// FOCUS RING TOKENS
// ============================================================================

export const focusRing = {
	color: 'oklch(0.623 0.214 259.815)',
	width: '4px',
	offset: '2px'
} as const

// ============================================================================
// GRADIENT TOKENS
// ============================================================================

export const gradients = {
	primary:
		'linear-gradient(135deg, oklch(0.623 0.214 259.815) 0%, oklch(0.623 0.214 259.815 / 80%) 100%)',
	secondary:
		'linear-gradient(135deg, oklch(0.2 0.01 210) 0%, oklch(0.2 0.01 258) 100%)',
	rainbow:
		'linear-gradient(135deg, oklch(0.619 0.196 286.032) 0%, oklch(0.519 0.181 327.802) 100%)',
	sunset:
		'linear-gradient(135deg, oklch(0.763 0.153 322.734) 0%, oklch(0.615 0.19 14.194) 100%)',
	ocean:
		'linear-gradient(135deg, oklch(0.741 0.153 217.508) 0%, oklch(0.827 0.214 194.769) 100%)'
} as const

// ============================================================================
// Z-INDEX TOKENS
// ============================================================================

export const zIndex = {
	0: 0,
	10: 10,
	20: 20,
	30: 30,
	40: 40,
	50: 50,
	auto: 'auto',
	dropdown: 1000,
	sticky: 1020,
	fixed: 1030,
	modalBackdrop: 1040,
	modal: 1050,
	popover: 1060,
	tooltip: 1070,
	toast: 1080,
	maximum: 2147483647
} as const

// ============================================================================
// UNIFIED TOKENS EXPORT
// ============================================================================

export const tokens = {
	typography,
	colors,
	spacing,
	layout,
	radius,
	shadows,
	animation,
	glass,
	buttons,
	focusRing,
	gradients,
	zIndex
} as const

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type TypographyTokens = typeof typography
export type ColorTokens = typeof colors
export type SpacingTokens = typeof spacing
export type LayoutTokens = typeof layout
export type RadiusTokens = typeof radius
export type ShadowTokens = typeof shadows
export type AnimationTokens = typeof animation
export type GlassTokens = typeof glass
export type ButtonTokens = typeof buttons
export type FocusRingTokens = typeof focusRing
export type GradientTokens = typeof gradients
export type ZIndexTokens = typeof zIndex
export type DesignTokens = typeof tokens

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate CSS custom properties from design tokens
 */
export function generateCSSCustomProperties(
	tokens: Record<string, unknown>,
	prefix = '--'
): Record<string, string> {
	const cssProperties: Record<string, string> = {}

	function flatten(obj: Record<string, unknown>, parentKey = ''): void {
		for (const [key, value] of Object.entries(obj)) {
			const cssKey = parentKey ? `${parentKey}-${key}` : key

			if (
				typeof value === 'object' &&
				value !== null &&
				!Array.isArray(value)
			) {
				flatten(value as Record<string, unknown>, cssKey)
			} else {
				cssProperties[`${prefix}${cssKey}`] = String(value)
			}
		}
	}

	flatten(tokens)
	return cssProperties
}

/**
 * Get a nested token value safely
 */
export function getToken<T>(path: string, defaultValue?: T): T | undefined {
	const keys = path.split('.')
	let current: unknown = tokens

	for (const key of keys) {
		if (current && typeof current === 'object' && key in current) {
			current = (current as Record<string, unknown>)[key]
		} else {
			return defaultValue
		}
	}

	return current as T
}

/**
 * Create CSS variable reference
 */
export function cssVar(path: string): string {
	return `var(--${path.replace(/\./g, '-')})`
}

export default tokens
