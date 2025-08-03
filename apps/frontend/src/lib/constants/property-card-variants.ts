import { cva } from 'class-variance-authority'

export const propertyCardVariants = cva(
  [
    "group relative overflow-hidden rounded-2xl border backdrop-blur-sm",
    "transition-all duration-300 ease-out",
    "hover:shadow-xl hover:shadow-primary/10 hover:translate-y-[-4px]",
    "focus-within:ring-2 focus-within:ring-primary/50 focus-within:ring-offset-2"
  ].join(' '),
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-br from-card via-card to-card/95",
          "border-border/50 hover:border-primary/30"
        ].join(' '),
        featured: [
          "bg-gradient-to-br from-primary-50 via-card to-accent-50/30",
          "border-primary/30 hover:border-primary/50",
          "shadow-lg shadow-primary/10"
        ].join(' '),
        premium: [
          "bg-gradient-to-br from-tertiary-50/50 via-card to-tertiary-50/20",
          "border-tertiary/30 hover:border-tertiary/50",
          "shadow-lg shadow-tertiary/10"
        ].join(' '),
        alert: [
          "bg-gradient-to-br from-warning-50/50 via-card to-error-50/20",
          "border-warning/30 hover:border-error/40",
          "shadow-lg shadow-warning/10"
        ].join(' ')
      },
      size: {
        compact: "p-4",
        default: "p-6",
        large: "p-8"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)
