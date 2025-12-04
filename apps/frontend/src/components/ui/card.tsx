import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "#lib/utils"

const cardVariants = cva(
  "bg-card text-card-foreground flex flex-col rounded-xl border",
  {
    variants: {
      variant: {
        default: "gap-6 py-6 shadow-sm",
        elevated: "gap-6 py-6 shadow-md",
        interactive: "gap-6 py-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer",
        premium: "gap-6 py-6 shadow-lg border-primary/20 bg-card/80",
        // Pricing variants
        pricing: "h-full overflow-hidden border-border/60 bg-card/80 shadow-sm backdrop-blur transition-all ease-out hover:-translate-y-1 hover:shadow-lg",
        pricingPopular: "h-full overflow-hidden border-border/60 bg-card/80 shadow-sm backdrop-blur transition-all ease-out hover:-translate-y-1 hover:shadow-lg ring-2 ring-primary/70",
        // Feature cards
        stat: "group relative p-6 border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5",
        showcase: "relative bg-card/50 border-border/40 p-6 text-center backdrop-blur-sm hover:bg-card/90 hover:border-primary/40 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10 overflow-hidden hover:-translate-y-1 hover:scale-[1.02]",
        testimonial: "relative border-border rounded-2xl p-8 h-full hover:border-primary/40 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5",
        accordion: "rounded-2xl border-border/50 bg-background/60 px-5 transition-colors hover:border-primary/30",
        // Portal variants
        pricingFeature: "group p-5 rounded-2xl border-2 hover:shadow-lg cursor-pointer transition-all duration-200 bg-primary/8 border-primary/20 hover:border-primary/30",
        pricingFeatureAccent: "group p-5 rounded-2xl border-2 hover:shadow-lg cursor-pointer transition-all duration-200 bg-accent/8 border-accent/20 hover:border-accent/30",
        portalFeature: "text-center p-4 bg-background/50 rounded-xl border-muted/30 hover:bg-primary/5 transition-all",
        portalFeatureSecondary: "text-center p-4 bg-background/50 rounded-xl border-muted/30 hover:bg-secondary/5 transition-all",
        portalFeatureAccent: "text-center p-4 bg-background/50 rounded-xl border-muted/30 hover:bg-accent/5 transition-all",
        billingInfo: "bg-background/70 rounded-lg p-4 border-primary/20",
        // Glass variants
        glass: "backdrop-blur-md border glass",
        glassStrong: "backdrop-blur-md border glass-strong",
        glassPremium: "backdrop-blur-md border card-glass-premium",
        // Section feature card
        sectionFeature: "group/feature relative p-6 bg-card/50 border-border/40 hover:border-primary/15 hover:bg-card/95 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 backdrop-blur-sm hover:-translate-y-0.5",
        // Bento grid card
        bento: "group relative flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Card({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants>) {
  return (
    <div
      className={cn(cardVariants({ variant }), className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-.card-action:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "card-action col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
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
}
