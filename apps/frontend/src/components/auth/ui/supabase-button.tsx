import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { supabaseButtonVariants } from "./supabase-button-variants"

export const SupabaseButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> &
    VariantProps<typeof supabaseButtonVariants> & {
      asChild?: boolean
    }
>(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(supabaseButtonVariants({ variant, size, className }))}
      {...props}
    />
  )
})

SupabaseButton.displayName = "SupabaseButton"