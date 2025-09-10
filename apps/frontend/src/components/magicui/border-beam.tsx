import { 
  cn, 
  ANIMATION_DURATIONS 
} from "@/lib/design-system"

interface BorderBeamProps {
  className?: string
  size?: number
  duration?: number
  borderWidth?: number
  anchor?: number
  colorFrom?: string
  colorTo?: string
  delay?: number
  variant?: 'primary' | 'accent' | 'rainbow' | 'success' | 'warning' | 'danger'
}

export const BorderBeam = ({
  className,
  size = 200,
  duration = 15,
  anchor = 90,
  borderWidth = 1.5,
  colorFrom,
  colorTo,
  delay = 0,
  variant = 'primary',
}: BorderBeamProps) => {
  // Color variants
  const colorVariants = {
    primary: { from: 'var(--primary)', to: 'var(--primary-foreground)' },
    accent: { from: 'var(--accent)', to: 'var(--accent-foreground)' },
    rainbow: { from: '#ff6b6b', to: '#4ecdc4' },
    success: { from: '#10b981', to: '#065f46' },
    warning: { from: '#f59e0b', to: '#92400e' },
    danger: { from: '#ef4444', to: '#991b1b' },
  }

  const selectedColors = colorVariants[variant]
  const finalColorFrom = colorFrom || selectedColors.from
  const finalColorTo = colorTo || selectedColors.to

  return (
    <div
      style={
        {
          "--size": size,
          "--duration": duration,
          "--anchor": anchor,
          "--border-width": borderWidth,
          "--color-from": finalColorFrom,
          "--color-to": finalColorTo,
          "--delay": `-${delay}s`,
        } as React.CSSProperties
      }
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width)*1px)_solid_transparent]",

        // mask styles
        "![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)]",

        // pseudo styles
        "after:absolute after:aspect-square after:w-[calc(var(--size)*1px)] after:animate-border-beam after:[animation-delay:var(--delay)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--anchor)*1%)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)*1px))]",
        
        // Enhanced styles for better performance
        "after:will-change-transform after:backface-visibility-hidden",
        className,
      )}
    />
  )
}