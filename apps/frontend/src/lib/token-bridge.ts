/**
 * Token Bridge Utility
 * Maps design tokens to CSS custom properties for consistent usage
 */

// Primary brand color variants from design tokens
export const primaryTokens = {
	base: 'var(--color-primary-brand)',
	10: 'var(--color-primary-brand-10)',
	15: 'var(--color-primary-brand-15)',
	25: 'var(--color-primary-brand-25)',
	40: 'var(--color-primary-brand-40)',
	50: 'var(--color-primary-brand-50)',
	85: 'var(--color-primary-brand-85)'
} as const

// System color variants
export const systemTokens = {
	red: {
		base: 'var(--color-system-red)',
		10: 'var(--color-system-red-10)',
		15: 'var(--color-system-red-15)',
		25: 'var(--color-system-red-25)',
		50: 'var(--color-system-red-50)',
		85: 'var(--color-system-red-85)'
	},
	green: {
		base: 'var(--color-system-green)',
		10: 'var(--color-system-green-10)',
		15: 'var(--color-system-green-15)',
		25: 'var(--color-system-green-25)',
		50: 'var(--color-system-green-50)',
		85: 'var(--color-system-green-85)'
	},
	blue: {
		base: 'var(--color-system-blue)',
		10: 'var(--color-system-blue-10)',
		15: 'var(--color-system-blue-15)',
		25: 'var(--color-system-blue-25)',
		50: 'var(--color-system-blue-50)',
		85: 'var(--color-system-blue-85)'
	}
} as const

// Glass material tokens
export const glassTokens = {
	material: 'var(--glass-material)',
	border: 'var(--glass-border)',
	shadow: 'var(--glass-shadow)'
} as const

// Animation tokens
export const animationTokens = {
	durations: {
		quick: 'var(--duration-quick)',
		standard: 'var(--duration-standard)',
		slow: 'var(--duration-slow)'
	},
	easings: {
		inOut: 'var(--ease-smooth)',
		out: 'var(--ease-out-smooth)',
		in: 'var(--ease-in-smooth)'
	}
} as const

// Animation presets for common use cases
export const animationPresets = {
	microHover: {
		transition: `all ${animationTokens.durations.quick} ${animationTokens.easings.out}`,
		transform: 'scale(var(--scale-hover))'
	},

	lift: {
		transition: `all ${animationTokens.durations.standard} ${animationTokens.easings.out}`,
		transform: 'translateY(var(--translate-hover-y))',
		boxShadow: 'var(--shadow-large)'
	},

	scale: {
		transition: `transform ${animationTokens.durations.quick} ${animationTokens.easings.out}`,
		transform: 'scale(var(--scale-hover))'
	},

	fadeIn: {
		opacity: 1,
		transition: `opacity ${animationTokens.durations.standard} ${animationTokens.easings.out}`
	},

	slideUp: {
		transform: 'translateY(0)',
		opacity: 1,
		transition: `all ${animationTokens.durations.standard} ${animationTokens.easings.out}`
	},

	glassShimmer: {
		position: 'relative',
		overflow: 'hidden',
		'&::before': {
			content: '""',
			position: 'absolute',
			top: 0,
			left: '-100%',
			width: '100%',
			height: '100%',
			background:
				'linear-gradient(90deg, transparent, var(--color-background-secondary), transparent)',
			transition: `left ${animationTokens.durations.slow} ${animationTokens.easings.out}`
		},
		'&:hover::before': {
			left: '100%'
		}
	}
} as const

export const radiusTokens = {
	small: 'var(--radius-small)',
	medium: 'var(--radius-medium)',
	large: 'var(--radius-large)',
	xlarge: 'var(--radius-xlarge)',
	xxlarge: 'var(--radius-xxlarge)'
} as const


export const spacingTokens = {
	0: 'var(--spacing-0)',
	px: 'var(--spacing-px)',
	0.5: 'var(--spacing-0_5)',
	1: 'var(--spacing-1)',
	1.5: 'var(--spacing-1_5)',
	2: 'var(--spacing-2)',
	2.5: 'var(--spacing-2_5)',
	3: 'var(--spacing-3)',
	3.5: 'var(--spacing-3_5)',
	4: 'var(--spacing-4)',
	5: 'var(--spacing-5)',
	6: 'var(--spacing-6)',
	7: 'var(--spacing-7)',
	8: 'var(--spacing-8)',
	9: 'var(--spacing-9)',
	10: 'var(--spacing-10)',
	11: 'var(--spacing-11)',
	12: 'var(--spacing-12)',
	14: 'var(--spacing-14)',
	16: 'var(--spacing-16)',
	20: 'var(--spacing-20)',
	24: 'var(--spacing-24)',
	28: 'var(--spacing-28)',
	32: 'var(--spacing-32)',
	36: 'var(--spacing-36)',
	40: 'var(--spacing-40)',
	44: 'var(--spacing-44)',
	48: 'var(--spacing-48)',
	52: 'var(--spacing-52)',
	56: 'var(--spacing-56)',
	60: 'var(--spacing-60)',
	64: 'var(--spacing-64)',
	72: 'var(--spacing-72)',
	80: 'var(--spacing-80)',
	96: 'var(--spacing-96)'
} as const

export const shadowTokens = {
	small: 'var(--shadow-small)',
	medium: 'var(--shadow-medium)',
	large: 'var(--shadow-large)'
} as const

export const typographyTokens = {
	fontFamily: 'var(--font-family)',
	sizes: {
		largeTitle: 'var(--font-large-title)',
		title1: 'var(--font-title-1)',
		title2: 'var(--font-title-2)',
		title3: 'var(--font-title-3)',
		headline: 'var(--font-headline)',
		body: 'var(--font-body)',
		callout: 'var(--font-callout)',
		subheadline: 'var(--font-subheadline)',
		footnote: 'var(--font-footnote)',
		caption1: 'var(--font-caption-1)',
		caption2: 'var(--font-caption-2)'
	},
	lineHeights: {
		largeTitle: 'var(--line-height-large-title)',
		title1: 'var(--line-height-title-1)',
		title2: 'var(--line-height-title-2)',
		title3: 'var(--line-height-title-3)',
		headline: 'var(--line-height-headline)',
		body: 'var(--line-height-body)',
		callout: 'var(--line-height-callout)',
		subheadline: 'var(--line-height-subheadline)',
		footnote: 'var(--line-height-footnote)',
		caption: 'var(--line-height-caption)'
	}
} as const


export const getTokenStyle = (
	category:
		| 'primary'
		| 'system'
		| 'glass'
		| 'animation'
		| 'radius'
		| 'shadow'
		| 'typography'
		| 'spacing'
) => {
	const tokenMap = {
		primary: primaryTokens,
		system: systemTokens,
		glass: glassTokens,
		animation: animationTokens,
		radius: radiusTokens,
		shadow: shadowTokens,
		typography: typographyTokens,
		spacing: spacingTokens
	}

	return tokenMap[category]
}


export const primaryWithOpacity = (
	opacity: 10 | 15 | 25 | 40 | 50 | 85 = 50
) => {
	return primaryTokens[opacity]
}

export const glassEffect = {
	background: glassTokens.material,
	border: glassTokens.border,
	boxShadow: glassTokens.shadow,
	backdropFilter: 'blur(20px)',
	WebkitBackdropFilter: 'blur(20px)'
} as const

export const glassPresets = {
	default: {
		background: 'var(--glass-material)',
		border: 'var(--glass-border)',
		boxShadow: 'var(--glass-shadow)',
		backdropFilter: 'blur(12px)',
		WebkitBackdropFilter: 'blur(12px)'
	},

	strong: {
		background: 'var(--color-primary-brand-15)',
		border: '1px solid var(--color-primary-brand-25)',
		boxShadow: 'var(--shadow-medium)',
		backdropFilter: 'blur(24px)',
		WebkitBackdropFilter: 'blur(24px)'
	},

	subtle: {
		background: 'var(--color-fill-primary)',
		border: '1px solid var(--color-fill-tertiary)',
		boxShadow: 'var(--shadow-small)',
		backdropFilter: 'blur(4px)',
		WebkitBackdropFilter: 'blur(4px)'
	},

	frosted: {
		background: 'var(--color-fill-secondary)',
		border: '1px solid var(--color-separator)',
		boxShadow: 'var(--shadow-medium)',
		backdropFilter: 'blur(16px)',
		WebkitBackdropFilter: 'blur(16px)'
	},

	vibrant: {
		background: 'var(--color-primary-brand-10)',
		border: '1px solid var(--color-primary-brand-15)',
		boxShadow: 'var(--shadow-large)',
		backdropFilter: 'blur(24px)',
		WebkitBackdropFilter: 'blur(24px)'
	}
} as const

export const getTypographyStyle = (variant: TypographyVariant) => {
	const variants = {
		largeTitle: {
			fontSize: typographyTokens.sizes.largeTitle,
			lineHeight: typographyTokens.lineHeights.largeTitle,
			letterSpacing: 'var(--tracking-large-title)',
			fontWeight: '700',
			fontFamily: typographyTokens.fontFamily
		},
		title1: {
			fontSize: typographyTokens.sizes.title1,
			lineHeight: typographyTokens.lineHeights.title1,
			letterSpacing: 'var(--tracking-title)',
			fontWeight: '700',
			fontFamily: typographyTokens.fontFamily
		},
		title2: {
			fontSize: typographyTokens.sizes.title2,
			lineHeight: typographyTokens.lineHeights.title2,
			letterSpacing: 'var(--tracking-title)',
			fontWeight: '400',
			fontFamily: typographyTokens.fontFamily
		},
		title3: {
			fontSize: typographyTokens.sizes.title3,
			lineHeight: typographyTokens.lineHeights.title3,
			letterSpacing: 'var(--tracking-title)',
			fontWeight: '400',
			fontFamily: typographyTokens.fontFamily
		},
		headline: {
			fontSize: typographyTokens.sizes.headline,
			lineHeight: typographyTokens.lineHeights.headline,
			letterSpacing: 'var(--tracking-headline)',
			fontWeight: '700',
			fontFamily: typographyTokens.fontFamily
		},
		body: {
			fontSize: typographyTokens.sizes.body,
			lineHeight: typographyTokens.lineHeights.body,
			letterSpacing: 'var(--tracking-body)',
			fontWeight: '400',
			fontFamily: typographyTokens.fontFamily
		},
		callout: {
			fontSize: typographyTokens.sizes.callout,
			lineHeight: typographyTokens.lineHeights.callout,
			letterSpacing: 'var(--tracking-body)',
			fontWeight: '400',
			fontFamily: typographyTokens.fontFamily
		},
		subheadline: {
			fontSize: typographyTokens.sizes.subheadline,
			lineHeight: typographyTokens.lineHeights.subheadline,
			letterSpacing: 'var(--tracking-subheadline)',
			fontWeight: '400',
			fontFamily: typographyTokens.fontFamily
		},
		footnote: {
			fontSize: typographyTokens.sizes.footnote,
			lineHeight: typographyTokens.lineHeights.footnote,
			letterSpacing: 'var(--tracking-footnote)',
			fontWeight: '400',
			fontFamily: typographyTokens.fontFamily
		},
		caption: {
			fontSize: typographyTokens.sizes.caption1,
			lineHeight: typographyTokens.lineHeights.caption,
			letterSpacing: 'var(--tracking-caption)',
			fontWeight: '400',
			fontFamily: typographyTokens.fontFamily
		}
	} as const

	return variants[variant]
}


export const getSpacing = (size: SpacingSize) => {
	return spacingTokens[size]
}


export const spacingPatterns = {
	componentPadding: spacingTokens[6], // 1.5rem - standard component padding
	componentGap: spacingTokens[4], // 1rem - standard gap between elements

	sectionSpacing: spacingTokens[12], // 3rem - between major sections
	cardSpacing: spacingTokens[6], // 1.5rem - card internal spacing

	textGap: spacingTokens[1.5], // 0.375rem - between related text elements
	paragraphSpacing: spacingTokens[4], // 1rem - between paragraphs

	buttonPadding: spacingTokens[4], // 1rem - horizontal button padding
	buttonGap: spacingTokens[2], // 0.5rem - gap between buttons

	formGroupSpacing: spacingTokens[6], // 1.5rem - between form groups
	labelInputGap: spacingTokens[2] // 0.5rem - between label and input
} as const


export const getGlassPreset = (variant: GlassVariant) => {
	return glassPresets[variant]
}

export const getAnimationPreset = (preset: AnimationPreset) => {
	return animationPresets[preset]
}

export const createTransition = (
	properties: string[],
	duration: 'quick' | 'standard' | 'slow' = 'standard',
	easing: 'in' | 'out' | 'inOut' = 'out'
) => {
	const durationValue = animationTokens.durations[duration]
	const easingValue = animationTokens.easings[easing]
	return properties
		.map(prop => `${prop} ${durationValue} ${easingValue}`)
		.join(', ')
}


export const animationHelpers = {
	// GPU acceleration for smooth animations
	gpuAccelerate: {
		transform: 'translateZ(0)',
		willChange: 'transform'
	},

	respectReducedMotion: {
		'@media (prefers-reduced-motion: reduce)': {
			animation: 'none !important',
			transition: 'none !important'
		}
	},

	smoothHover: {
		transition: createTransition(['transform', 'box-shadow'], 'quick'),
		'&:hover': animationPresets.microHover
	},

	smoothScale: {
		transition: createTransition(['transform'], 'quick'),
		'&:hover': { transform: 'scale(1.05)' },
		'&:active': { transform: 'scale(0.95)' }
	},

	smoothLift: {
		transition: createTransition(['transform', 'box-shadow'], 'standard'),
		'&:hover': animationPresets.lift
	}
} as const

export type TokenCategory =
	| 'primary'
	| 'system'
	| 'glass'
	| 'animation'
	| 'radius'
	| 'shadow'
	| 'typography'
	| 'spacing'
export type OpacityLevel = 10 | 15 | 25 | 40 | 50 | 85
export type TypographyVariant =
	| 'largeTitle'
	| 'title1'
	| 'title2'
	| 'title3'
	| 'headline'
	| 'body'
	| 'callout'
	| 'subheadline'
	| 'footnote'
	| 'caption'
export type SpacingSize =
	| 0
	| 'px'
	| 0.5
	| 1
	| 1.5
	| 2
	| 2.5
	| 3
	| 3.5
	| 4
	| 5
	| 6
	| 7
	| 8
	| 9
	| 10
	| 11
	| 12
	| 14
	| 16
	| 20
	| 24
	| 28
	| 32
	| 36
	| 40
	| 44
	| 48
	| 52
	| 56
	| 60
	| 64
	| 72
	| 80
	| 96
export type GlassVariant =
	| 'default'
	| 'strong'
	| 'subtle'
	| 'frosted'
	| 'vibrant'
export type AnimationPreset =
	| 'microHover'
	| 'lift'
	| 'scale'
	| 'fadeIn'
	| 'slideUp'
	| 'glassShimmer'
export type AnimationDuration = 'quick' | 'standard' | 'slow'
export type AnimationEasing = 'in' | 'out' | 'inOut'
