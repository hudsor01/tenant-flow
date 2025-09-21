"use client"

import * as React from "react"
import * as AccordionPrimitive from "@radix-ui/react-accordion"
import { ChevronDownIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn(
        // Base styles
        "tw-:border-b tw-:last:border-b-0",
        // Enhanced transitions
        "tw-:transition-all tw-:duration-200 tw-:ease-in-out",
        className
      )}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="tw-:flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          // Base styles with token-based radius
          "tw-:flex tw-:flex-1 tw-:items-start tw-:justify-between tw-:gap-4 tw-:rounded-[8px] tw-:py-4",
          "tw-:text-left tw-:text-sm tw-:font-medium tw-:outline-none",
          // Enhanced transitions
          "tw-:transition-all tw-:duration-200 tw-:ease-in-out",
          // Hover state
          "tw-:hover:underline tw-:hover:opacity-90",
          // Focus state with token-based styling
          "tw-:focus-visible:border-ring tw-:focus-visible:ring-ring/50 tw-:focus-visible:ring-[3px]",
          // Disabled state
          "tw-:disabled:pointer-events-none tw-:disabled:opacity-50",
          // Open state animation
          "tw-:[&[data-state=open]>svg]:rotate-180",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="tw-:text-muted-foreground tw-:pointer-events-none tw-:size-4 tw-:shrink-0 tw-:translate-y-0.5 tw-:transition-transform tw-:duration-200 tw-:ease-out" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        // Base styles
        "tw-:overflow-hidden tw-:text-sm",
        // Enhanced animations
        "tw-:data-[state=closed]:animate-accordion-up tw-:data-[state=open]:animate-accordion-down",
        // Smooth transitions
        "tw-:transition-all tw-:duration-300 tw-:ease-out"
      )}
      {...props}
    >
      <div className={cn("tw-:pt-0 tw-:pb-4", className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
