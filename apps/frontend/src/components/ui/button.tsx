import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "tw-:inline-flex tw-:items-center tw-:justify-center tw-:gap-2 tw-:whitespace-nowrap tw-:text-sm tw-:font-medium tw-:transition-all tw-:duration-200 tw-:ease-in-out tw-:transform-gpu tw-:disabled:pointer-events-none tw-:disabled:opacity-50 tw-:[&_svg]:pointer-events-none tw-:[&_svg:not([class*=size-])]:size-4 tw-:shrink-0 tw-:[&_svg]:shrink-0 tw-:outline-none tw-:focus-visible:border-ring tw-:focus-visible:ring-ring/50 tw-:focus-visible:ring-[3px] tw-:aria-invalid:ring-destructive/20 tw-:dark:aria-invalid:ring-destructive/40 tw-:aria-invalid:border-destructive tw-:hover:scale-[1.02] tw-:hover:shadow-md tw-:active:scale-[0.98] tw-:active:duration-150",
  {
    variants: {
      variant: {
        default:
          "tw-:bg-primary tw-:text-primary-foreground tw-:shadow-xs tw-:hover:bg-primary/90",
        destructive:
          "tw-:bg-destructive tw-:text-white tw-:shadow-xs tw-:hover:bg-destructive/90 tw-:focus-visible:ring-destructive/20 tw-:dark:focus-visible:ring-destructive/40 tw-:dark:bg-destructive/60",
        outline:
          "tw-:border tw-:bg-background tw-:shadow-xs tw-:hover:bg-accent tw-:hover:text-accent-foreground tw-:dark:bg-input/30 tw-:dark:border-input tw-:dark:hover:bg-input/50",
        secondary:
          "tw-:bg-secondary tw-:text-secondary-foreground tw-:shadow-xs tw-:hover:bg-secondary/80",
        ghost:
          "tw-:hover:bg-accent tw-:hover:text-accent-foreground tw-:dark:hover:bg-accent/50",
        link: "tw-:text-primary tw-:underline-offset-4 tw-:hover:underline",
        success:
          "tw-:bg-success tw-:text-success-foreground tw-:shadow-xs tw-:hover:bg-success/90",
        warning:
          "tw-:bg-warning tw-:text-warning-foreground tw-:shadow-xs tw-:hover:bg-warning/90",
      },
      size: {
        default: "tw-:h-9 tw-:px-4 tw-:py-2 tw-:has-[>svg]:px-3",
        sm: "tw-:h-8 tw-:gap-1.5 tw-:px-3 tw-:has-[>svg]:px-2.5",
        lg: "tw-:h-10 tw-:px-6 tw-:has-[>svg]:px-4",
        icon: "tw-:size-9",
      },
      radius: {
        xs: "tw-:rounded-[8px]",
        sm: "tw-:rounded-[12px]",
        md: "tw-:rounded-[16px]",
        lg: "tw-:rounded-[20px]",
        xl: "tw-:rounded-[28px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      radius: "md",
    },
  }
)

function Button({
  className,
  variant,
  size,
  radius,
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
      className={cn(buttonVariants({ variant, size, radius, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
