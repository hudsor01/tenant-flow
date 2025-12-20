/**
 * Animation utilities using TailwindCSS v4 + tw-animate
 * Replaces react-spring with native CSS animations
 */

export type AnimationPreset =
	| 'fadeIn'
	| 'fadeOut'
	| 'slideUp'
	| 'slideDown'
	| 'slideLeft'
	| 'slideRight'
	| 'scaleIn'
	| 'scaleOut'

export interface AnimationConfig {
	duration?: 'fast' | 'normal' | 'slow' | 'slower'
	delay?: number
}

/**
 * Returns Tailwind className string for animation preset
 * Uses tw-animate library classes + Tailwind utilities
 */
export function useAnimation(
	preset: AnimationPreset,
	config?: Partial<AnimationConfig>
): string {
	const duration = config?.duration || 'fast'
	const delay = config?.delay || 0

	const durationClass = {
		fast: '[transition-duration:var(--duration-fast)]',
		normal: '[transition-duration:var(--duration-normal)]',
		slow: '[transition-duration:var(--duration-slow)]',
		slower: '[transition-duration:var(--duration-slower)]'
	}[duration]

	const delayClass = delay > 0 ? `delay-${Math.min(delay, 1000)}` : ''

	const presetClasses: Record<AnimationPreset, string> = {
		fadeIn: 'animate-in fade-in-0',
		fadeOut: 'animate-out fade-out-0',
		slideUp: 'animate-in fade-in-0 slide-in-from-bottom-4',
		slideDown: 'animate-in fade-in-0 slide-in-from-top-4',
		slideLeft: 'animate-in fade-in-0 slide-in-from-right-4',
		slideRight: 'animate-in fade-in-0 slide-in-from-left-4',
		scaleIn: 'animate-in fade-in-0 zoom-in-95',
		scaleOut: 'animate-out fade-out-0 zoom-out-95'
	}

	return `${presetClasses[preset]} ${durationClass} ${delayClass}`.trim()
}

// Convenience hooks
export function useFadeIn(config?: Partial<AnimationConfig>): string {
	return useAnimation('fadeIn', config)
}

export function useFadeOut(config?: Partial<AnimationConfig>): string {
	return useAnimation('fadeOut', config)
}

export function useSlideUp(config?: Partial<AnimationConfig>): string {
	return useAnimation('slideUp', config)
}

export function useSlideDown(config?: Partial<AnimationConfig>): string {
	return useAnimation('slideDown', config)
}

export function useSlideLeft(config?: Partial<AnimationConfig>): string {
	return useAnimation('slideLeft', config)
}

export function useSlideRight(config?: Partial<AnimationConfig>): string {
	return useAnimation('slideRight', config)
}

export function useScaleIn(config?: Partial<AnimationConfig>): string {
	return useAnimation('scaleIn', config)
}

export function useScaleOut(config?: Partial<AnimationConfig>): string {
	return useAnimation('scaleOut', config)
}
