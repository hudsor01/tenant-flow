import type { CSSProperties } from "react";
import React, { useEffect, useState } from "react";

import { 
  cn, 
  ANIMATION_DURATIONS
} from "@/lib/design-system";
import type { ComponentProps } from "@repo/shared";

export interface ShimmerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, ComponentProps {
  shimmerColor?: string;
  shimmerSize?: string;
  borderRadius?: string;
  shimmerDuration?: string;
  background?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  intensity?: 'subtle' | 'normal' | 'intense';
  reducedMotion?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const ShimmerButton = React.forwardRef<HTMLButtonElement, ShimmerButtonProps>(
  (
    {
      shimmerColor,
      shimmerSize = "0.05em",
      shimmerDuration = "3s",
      borderRadius = "12px",
      background,
      className,
      children,
      variant = 'primary',
      size = 'md',
      intensity = 'normal',
      reducedMotion = false,
      icon,
      iconPosition = 'left',
      disabled,
      ...props
    },
    ref,
  ) => {
    // Check for prefers-reduced-motion
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

    useEffect(() => {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReducedMotion(mediaQuery.matches)

      const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }, [])

    const shouldReduceMotion = reducedMotion || prefersReducedMotion

    // Enhanced variant configurations with modern SaaS colors
    const variants = {
      primary: {
        background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary)/90 100%)',
        shimmer: '#ffffff',
        text: 'text-primary-foreground',
        shadow: 'shadow-lg shadow-primary/25'
      },
      secondary: {
        background: 'linear-gradient(135deg, var(--secondary) 0%, var(--secondary)/80 100%)',
        shimmer: 'var(--primary)',
        text: 'text-secondary-foreground',
        shadow: 'shadow-md shadow-secondary/20'
      },
      accent: {
        background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent)/90 100%)',
        shimmer: '#ffffff',
        text: 'text-accent-foreground',
        shadow: 'shadow-lg shadow-accent/25'
      },
      success: {
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        shimmer: '#ffffff',
        text: 'text-white',
        shadow: 'shadow-lg shadow-green-500/25'
      },
      warning: {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        shimmer: '#ffffff',
        text: 'text-white',
        shadow: 'shadow-lg shadow-amber-500/25'
      },
      danger: {
        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
        shimmer: '#ffffff',
        text: 'text-white',
        shadow: 'shadow-lg shadow-red-500/25'
      },
    }

    // Enhanced size configurations
    const sizes = {
      sm: {
        base: 'px-4 py-2.5 text-sm',
        icon: 'w-4 h-4',
        gap: 'gap-2'
      },
      md: {
        base: 'px-6 py-3 text-base',
        icon: 'w-5 h-5',
        gap: 'gap-2.5'
      },
      lg: {
        base: 'px-8 py-4 text-lg',
        icon: 'w-6 h-6',
        gap: 'gap-3'
      }
    }

    // Intensity configurations for shimmer effect
    const intensityConfig = {
      subtle: {
        opacity: '0.3',
        speed: '4s',
        blur: '3px'
      },
      normal: {
        opacity: '0.6',
        speed: '3s',
        blur: '2px'
      },
      intense: {
        opacity: '0.9',
        speed: '2s',
        blur: '1px'
      }
    }

    const variantConfig = variants[variant as keyof typeof variants] ?? variants.primary
    const sizeConfig = sizes[size as keyof typeof sizes] ?? sizes.md
    const intensitySettings = intensityConfig[intensity as keyof typeof intensityConfig] ?? intensityConfig.normal
    const finalBackground = background || variantConfig.background
    const finalShimmerColor = shimmerColor || variantConfig.shimmer
    return (
      <button
        style={
          {
            "--spread": shouldReduceMotion ? "0deg" : "90deg",
            "--shimmer-color": shouldReduceMotion ? "transparent" : finalShimmerColor,
            "--radius": borderRadius,
            "--speed": shouldReduceMotion ? "0s" : (shimmerDuration || intensitySettings.speed),
            "--cut": shimmerSize,
            "--bg": finalBackground,
            "--shimmer-opacity": intensitySettings.opacity,
            "--shimmer-blur": intensitySettings.blur,
          } as CSSProperties
        }
        className={cn(
          // Base styles
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap font-semibold",
          "[background:var(--bg)] [border-radius:var(--radius)]",
          
          // Content layout
          sizeConfig.base,
          icon ? sizeConfig.gap : '',
          iconPosition === 'right' ? "flex-row-reverse" : '',
          
          // Colors and shadows
          variantConfig.text,
          variantConfig.shadow,
          "border border-white/10 backdrop-blur-sm",
          
          // Interactions
          shouldReduceMotion 
            ? "transition-colors duration-200" 
            : `transform-gpu transition-all duration-[${ANIMATION_DURATIONS.default}ms] ease-in-out`,
          !shouldReduceMotion && "active:translate-y-px hover:scale-[1.02]",
          "hover:brightness-110",
          
          // Accessibility
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/50",
          "focus-visible:ring-4 focus-visible:ring-primary/30",
          
          // Disabled state
          disabled && "opacity-50 cursor-not-allowed pointer-events-none",
          
          className,
        )}
        disabled={disabled}
        ref={ref}
        {...props}
      >
        {/* Shimmer effect - only rendered if not reduced motion */}
        {!shouldReduceMotion && (
          <div
            className={cn(
              "-z-30",
              `blur-[var(--shimmer-blur)]`,
              "absolute inset-0 overflow-visible [container-type:size]",
              `opacity-[var(--shimmer-opacity)]`,
            )}
          >
            <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [aspect-ratio:1] [border-radius:0] [mask:none]">
              <div 
                className="animate-spin-around absolute -inset-full w-auto rotate-0"
                style={{
                  background: `conic-gradient(from calc(270deg - (var(--spread) * 0.5)), transparent 0, var(--shimmer-color) var(--spread), transparent var(--spread))`,
                  animationDuration: `var(--speed)`
                }}
              />
            </div>
          </div>
        )}

        {/* Button content */}
        <div className="relative z-10 flex items-center justify-center">
          {icon && iconPosition === 'left' && (
            <span className={cn(sizeConfig.icon, "shrink-0")}>
              {icon}
            </span>
          )}
          
          {children && (
            <span className="leading-none">
              {children}
            </span>
          )}
          
          {icon && iconPosition === 'right' && (
            <span className={cn(sizeConfig.icon, "shrink-0")}>
              {icon}
            </span>
          )}
        </div>

        {/* Enhanced highlight effect */}
        <div
          className={cn(
            "absolute inset-0 size-full",
            "[border-radius:var(--radius)]",
            "shadow-[inset_0_-8px_10px_rgba(255,255,255,0.1)]",
            
            // Enhanced transitions
            shouldReduceMotion 
              ? "transition-opacity duration-200" 
              : "transform-gpu transition-all duration-300 ease-in-out",
            
            // Interactive states
            "group-hover:shadow-[inset_0_-6px_10px_rgba(255,255,255,0.2)]",
            "group-active:shadow-[inset_0_-10px_10px_rgba(255,255,255,0.25)]",
            
            // Focus state
            "group-focus-visible:shadow-[inset_0_-4px_10px_rgba(255,255,255,0.3)]",
          )}
        />

        {/* Backdrop */}
        <div
          className={cn(
            "absolute -z-20",
            "[background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]",
          )}
        />
      </button>
    );
  },
);

ShimmerButton.displayName = "ShimmerButton";

export { ShimmerButton };