import { useSpring } from '@react-spring/web'
import { MOTION_DURATIONS } from '@repo/shared/constants/motion-tokens'

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
  duration?: keyof typeof MOTION_DURATIONS
  delay?: number
}

export const ANIMATION_PRESETS = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: 'duration-fast'
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
    duration: 'duration-fast'
  },
  slideUp: {
    from: { opacity: 0, transform: 'translateY(1rem)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: 'duration-fast'
  },
  slideDown: {
    from: { opacity: 0, transform: 'translateY(-1rem)' },
    to: { opacity: 1, transform: 'translateY(0)' },
    duration: 'duration-fast'
  },
  slideLeft: {
    from: { opacity: 0, transform: 'translateX(1rem)' },
    to: { opacity: 1, transform: 'translateX(0)' },
    duration: 'duration-fast'
  },
  slideRight: {
    from: { opacity: 0, transform: 'translateX(-1rem)' },
    to: { opacity: 1, transform: 'translateX(0)' },
    duration: 'duration-fast'
  },
  scaleIn: {
    from: { opacity: 0, transform: 'scale(0.9)' },
    to: { opacity: 1, transform: 'scale(1)' },
    duration: 'duration-fast'
  },
  scaleOut: {
    from: { opacity: 1, transform: 'scale(1)' },
    to: { opacity: 0, transform: 'scale(0.9)' },
    duration: 'duration-fast'
  }
} as const

export function useAnimation(
  preset: AnimationPreset,
  config?: Partial<AnimationConfig>
) {
  const presetConfig = ANIMATION_PRESETS[preset]
  const duration = config?.duration ?? presetConfig.duration

  return useSpring({
    ...presetConfig,
    config: {
      duration: parseInt(MOTION_DURATIONS[duration]),
      easing: (t: number) => {
        // Simple ease-out-expo approximation
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
      }
    },
    delay: config?.delay
  })
}

// Convenience hooks
export function useFadeIn(config?: Partial<AnimationConfig>) {
  return useAnimation('fadeIn', config)
}

export function useFadeOut(config?: Partial<AnimationConfig>) {
  return useAnimation('fadeOut', config)
}

export function useSlideUp(config?: Partial<AnimationConfig>) {
  return useAnimation('slideUp', config)
}

export function useSlideDown(config?: Partial<AnimationConfig>) {
  return useAnimation('slideDown', config)
}

export function useSlideLeft(config?: Partial<AnimationConfig>) {
  return useAnimation('slideLeft', config)
}

export function useSlideRight(config?: Partial<AnimationConfig>) {
  return useAnimation('slideRight', config)
}

export function useScaleIn(config?: Partial<AnimationConfig>) {
  return useAnimation('scaleIn', config)
}

export function useScaleOut(config?: Partial<AnimationConfig>) {
  return useAnimation('scaleOut', config)
}