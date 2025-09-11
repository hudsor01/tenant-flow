import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn, cardClasses, ANIMATION_DURATIONS, SEMANTIC_COLORS } from "@/lib/design-system"

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow-sm",
  {
    variants: {
      variant: {
        default: "py-6",
        elevated: "py-6 shadow-lg hover:shadow-xl transition-shadow",
        interactive: "py-6 hover:shadow-md transition-all hover:scale-[1.01] cursor-pointer",
        premium: "py-6 border-gradient bg-gradient-to-br from-card via-card to-accent/5 shadow-lg",
        success: "py-6 border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/20",
        warning: "py-6 border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/20",
        error: "py-6 border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-900/20",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
        xl: "p-10",
      },
      padding: {
        none: "p-0",
        sm: "p-4",
        default: "p-6", 
        lg: "p-8",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type CardProps = React.ComponentProps<"div"> & VariantProps<typeof cardVariants>

function Card({ className, variant, size, padding, ...props }: CardProps) {
  // Map variant to design system variant
  const designSystemVariant = variant === 'elevated' ? 'elevated' 
    : variant === 'interactive' ? 'interactive'
    : variant === 'premium' ? 'premium'
    : 'default'

  return (
    <div
      data-slot="card"
      className={cn(
        // Use design system cardClasses for consistent styling
        cardClasses(designSystemVariant, className),
        // Fallback to cardVariants for legacy variants
        ['success', 'warning', 'error'].includes(variant || '') && cardVariants({ variant, size, padding })
      )}
      style={{
        transition: variant === 'interactive' || variant === 'elevated' 
          ? `all ${ANIMATION_DURATIONS.default} ease-out`
          : undefined,
        borderColor: variant === 'premium' ? SEMANTIC_COLORS.primary : undefined,
        ...(props.style || {})
      }}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
  cardVariants,
  type CardProps,
}
