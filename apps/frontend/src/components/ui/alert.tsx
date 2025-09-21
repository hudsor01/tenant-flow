import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-[12px] border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current transition-all duration-200 ease-in-out",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border hover:border-border/80 hover:shadow-sm",
        destructive:
          "text-destructive bg-destructive/5 border-destructive/20 [&>svg]:text-current *:data-[slot=alert-description]:text-destructive/90 hover:border-destructive/30 hover:bg-destructive/10",
        success:
          "text-success bg-success/5 border-success/20 [&>svg]:text-current *:data-[slot=alert-description]:text-success/90 hover:border-success/30 hover:bg-success/10",
        warning:
          "text-warning bg-warning/5 border-warning/20 [&>svg]:text-current *:data-[slot=alert-description]:text-warning/90 hover:border-warning/30 hover:bg-warning/10",
        info:
          "text-info bg-info/5 border-info/20 [&>svg]:text-current *:data-[slot=alert-description]:text-info/90 hover:border-info/30 hover:bg-info/10",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Alert({
  className,
  variant,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertTitle, AlertDescription }
