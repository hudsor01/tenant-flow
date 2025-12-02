import {
  borderBeamClasses
} from "#lib/design-system"

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
    primary: { from: 'var(--color-primary)', to: 'var(--color-primary-foreground)' },
    accent: { from: 'var(--color-accent)', to: 'var(--color-accent-foreground)' },
    rainbow: { from: 'var(--color-primary)', to: 'var(--color-accent)' },
    success: { from: 'var(--color-primary)', to: 'var(--color-primary-foreground)' },
    warning: { from: 'var(--color-accent)', to: 'var(--color-accent-foreground)' },
    danger: { from: 'var(--color-destructive)', to: 'var(--color-destructive-foreground)' },
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
      className={borderBeamClasses(variant, className)}
    />
  )
}
