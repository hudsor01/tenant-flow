import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const cardVariants = cva(
  [
    // Base layout
    "flex flex-col",
    // Spacing using design tokens
    "gap-[var(--spacing-6)]",
    "p-[var(--spacing-6)]",
    // Border radius using design tokens
    "rounded-[var(--radius-large)]",
    // Typography color using label hierarchy
    "text-[var(--color-label-primary)]",
    // Transitions using timing tokens
    "transition-all",
    "duration-[var(--duration-quick)]",
    "ease-[var(--ease-smooth)]",
    // Interactive feedback
    "has-[a:first-child]:hover:scale-[1.01]",
    "has-[button:first-child]:hover:scale-[1.01]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border border-[var(--color-separator)]",
          "bg-[var(--color-fill-primary)]",
          "shadow-[var(--shadow-small)]",
          "hover:bg-[var(--color-fill-secondary)]",
          "hover:shadow-[var(--shadow-medium)]",
          "hover:border-[var(--color-label-quaternary)]",
        ].join(" "),
        glass: [
          "bg-[var(--glass-material)]",
          "border-[var(--glass-border)]",
          "shadow-[var(--glass-shadow)]",
          "backdrop-blur-md",
          "hover:bg-[var(--color-primary-brand-10)]",
          "hover:border-[var(--color-primary-brand-25)]",
        ].join(" "),
        glassStrong: [
          "bg-[var(--color-primary-brand-15)]",
          "border",
          "border-[var(--color-primary-brand-25)]",
          "shadow-[var(--shadow-medium)]",
          "backdrop-blur-lg",
          "hover:bg-[var(--color-primary-brand-25)]",
          "hover:border-[var(--color-primary-brand-40)]",
          "hover:shadow-[var(--shadow-large)]",
        ].join(" "),
        glassSubtle: [
          "bg-[var(--color-fill-primary)]",
          "border",
          "border-[var(--color-fill-tertiary)]",
          "shadow-[var(--shadow-small)]",
          "backdrop-blur-sm",
          "hover:bg-[var(--color-fill-secondary)]",
          "hover:border-[var(--color-fill-primary)]",
        ].join(" "),
        elevated: [
          "border border-[var(--color-separator)]",
          "bg-[var(--color-fill-primary)]",
          "shadow-[var(--shadow-medium)]",
          "hover:bg-[var(--color-fill-secondary)]",
          "hover:shadow-[var(--shadow-large)]",
          "hover:border-[var(--color-primary-brand-25)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface CardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {}

function Card({ className, variant, ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      data-tokens="applied"
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      data-tokens="applied"
      className={cn(
        // Container query support
        "@container/card-header",
        // Grid layout
        "grid auto-rows-min grid-rows-[auto_auto] items-start",
        // Spacing using Apple design tokens
        "gap-[var(--spacing-1_5)]",
        "px-[var(--spacing-6)]",
        // Conditional grid for actions
        "has-data-[slot=card-action]:grid-cols-[1fr_auto]",
        // Border spacing using Apple tokens
        "[.border-b]:pb-[var(--spacing-6)]",
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
      data-tokens="applied"
      className={cn(
        // Typography using Apple design tokens
        "text-[var(--font-title-2)]",
        "leading-[var(--line-height-title-2)]",
        "tracking-[var(--tracking-title)]",
        "font-[var(--font-weight-semibold)]",
        "font-[var(--font-family)]",
        // Color using Apple label hierarchy
        "text-[var(--color-label-primary)]",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      data-tokens="applied"
      className={cn(
        // Typography using Apple design tokens
        "text-[var(--font-body)]",
        "leading-[var(--line-height-body)]",
        "tracking-[var(--tracking-body)]",
        "font-[var(--font-weight-normal)]",
        "font-[var(--font-family)]",
        // Color using Apple label hierarchy
        "text-[var(--color-label-secondary)]",
        className
      )}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      data-tokens="applied"
      className={cn(
        // Grid positioning
        "col-start-2 row-span-2 row-start-1",
        // Alignment
        "self-start justify-self-end",
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
      data-tokens="applied"
      className={cn(
        // Horizontal padding using Apple design tokens
        "px-[var(--spacing-6)]",
        className
      )}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      data-tokens="applied"
      className={cn(
        // Layout
        "flex items-center",
        // Horizontal padding using Apple design tokens
        "px-[var(--spacing-6)]",
        // Border spacing using Apple tokens
        "[.border-t]:pt-[var(--spacing-6)]",
        className
      )}
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
}
