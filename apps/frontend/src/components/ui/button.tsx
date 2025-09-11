import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, buttonClasses, ANIMATION_DURATIONS, SEMANTIC_COLORS } from "@/lib/design-system"

// Using design system buttonClasses with legacy cva fallback for existing variants
const buttonVariants = cva(
  `inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive`,
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        primary: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        destructive: "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-6 px-2 text-xs has-[>svg]:px-1.5",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        xl: "h-11 px-8 has-[>svg]:px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(
        // Use design system buttonClasses for consistent styling
        (['primary', 'secondary', 'outline', 'ghost', 'destructive'].includes(variant || '') || variant === 'default') ? 
          buttonClasses(variant === 'default' ? 'primary' : (variant as 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive') || 'primary', (size === 'icon' ? 'default' : size) || 'default', className) : '',
        // Fallback to buttonVariants for legacy variant compatibility (like 'link')
        !['primary', 'secondary', 'outline', 'ghost', 'destructive'].includes(variant || '') && buttonVariants({ variant, size })
      )}
      style={{ 
        transition: `all ${ANIMATION_DURATIONS.default} ease-out`,
        color: variant === 'primary' ? SEMANTIC_COLORS['primary-foreground'] : undefined,
        ...(props.style || {})
      }}
      {...props}
    />
  )
}

export { Button, buttonVariants }
