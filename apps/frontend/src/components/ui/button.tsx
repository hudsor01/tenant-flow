import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer transform hover:scale-105 active:scale-95 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 backface-hidden will-change-transform",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg active:shadow-md",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg hover:shadow-destructive/20 active:shadow-md",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:shadow-md hover:border-accent active:shadow-sm",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-md active:shadow-sm",
        ghost:
          "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
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
  // Temporary fix for Turbopack compatibility - simplified asChild implementation
  if (asChild) {
    return React.createElement(
      'div',
      {
        className: cn(buttonVariants({ variant, size, className })),
        ...props
      }
    )
  }

  return (
    <button
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
