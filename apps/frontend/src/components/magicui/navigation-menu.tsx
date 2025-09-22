import * as NavigationMenuPrimitive from "@radix-ui/react-navigation-menu"
import { cva } from "class-variance-authority"
import { ChevronDownIcon } from "lucide-react"
import * as React from "react"

import { cn } from "@/lib/design-system"

function NavigationMenu({
  className,
  children,
  viewport = true,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Root> & {
  viewport?: boolean
}) {
  return (
    <NavigationMenuPrimitive.Root
      data-slot="navigation-menu"
      data-viewport={viewport}
      data-tokens="applied" className={cn(
        "group/navigation-menu relative flex max-w-max flex-1 items-center justify-center",
        className
      )}
      {...props}
    >
      {children}
      {viewport && <NavigationMenuViewport />}
    </NavigationMenuPrimitive.Root>
  )
}

function NavigationMenuList({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.List>) {
  return (
    <NavigationMenuPrimitive.List
      data-slot="navigation-menu-list"
      data-tokens="applied" className={cn(
        "group flex flex-1 list-none items-center justify-center gap-1",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Item>) {
  return (
    <NavigationMenuPrimitive.Item
      data-slot="navigation-menu-item"
      data-tokens="applied" className={cn("relative", className)}
      {...props}
    />
  )
}

const navigationMenuTriggerStyle = cva(
  "group inline-flex h-[var(--spacing-9)] w-max items-center justify-center rounded-[var(--radius-medium)] bg-background px-[var(--spacing-4)] py-[var(--spacing-2)] text-[var(--font-size-sm)] font-[var(--font-weight-medium)] text-[var(--color-label-primary)] hover:bg-[var(--color-fill-secondary)] hover:text-[var(--color-label-primary)] focus:bg-[var(--color-fill-secondary)] focus:text-[var(--color-label-primary)] disabled:pointer-events-none disabled:opacity-50 data-[state=open]:hover:bg-[var(--color-fill-secondary)] data-[state=open]:text-[var(--color-label-primary)] data-[state=open]:focus:bg-[var(--color-fill-secondary)] data-[state=open]:bg-[var(--color-fill-primary)] focus-visible:ring-[var(--focus-ring-color)]/50 outline-none transition-all duration-[var(--duration-quick)] ease-[var(--ease-out-smooth)] focus-visible:ring-[var(--focus-ring-width)] focus-visible:outline-1"
)

function NavigationMenuTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Trigger>) {
  return (
    <NavigationMenuPrimitive.Trigger
      data-slot="navigation-menu-trigger"
      data-tokens="applied" className={cn(navigationMenuTriggerStyle(), "group", className)}
      {...props}
    >
      {children}{" "}
      <ChevronDownIcon
        className="relative top-[1px] ml-[var(--spacing-1)] size-3 transition-all duration-[var(--duration-standard)] ease-[var(--ease-out-smooth)] group-data-[state=open]:rotate-180"
        aria-hidden="true"
      />
    </NavigationMenuPrimitive.Trigger>
  )
}

function NavigationMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Content>) {
  return (
    <NavigationMenuPrimitive.Content
      data-slot="navigation-menu-content"
      data-tokens="applied" className={cn(
        "data-[motion^=from-]:animate-in data-[motion^=to-]:animate-out data-[motion^=from-]:fade-in data-[motion^=to-]:fade-out data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 top-0 left-0 w-full p-[var(--spacing-2)] pr-[var(--spacing-2_5)] md:absolute md:w-auto",
        "group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-[var(--spacing-1_5)] group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-[var(--radius-medium)] group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:shadow-[var(--shadow-small)] group-data-[viewport=false]/navigation-menu:duration-[var(--duration-quick)] **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuViewport({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Viewport>) {
  return (
    <div
      data-tokens="applied" className={cn(
        "absolute top-full left-0 isolate z-50 flex justify-center"
      )}
    >
      <NavigationMenuPrimitive.Viewport
        data-slot="navigation-menu-viewport"
        data-tokens="applied" className={cn(
          "origin-top-center bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-90 relative mt-[var(--spacing-1_5)] h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-[var(--radius-medium)] border shadow-[var(--shadow-small)] md:w-[var(--radix-navigation-menu-viewport-width)]",
          className
        )}
        {...props}
      />
    </div>
  )
}

function NavigationMenuLink({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Link>) {
  return (
    <NavigationMenuPrimitive.Link
      data-slot="navigation-menu-link"
      data-tokens="applied" className={cn(
        "data-[active=true]:focus:bg-[var(--color-fill-secondary)] data-[active=true]:hover:bg-[var(--color-fill-secondary)] data-[active=true]:bg-[var(--color-fill-primary)] data-[active=true]:text-[var(--color-label-primary)] hover:bg-[var(--color-fill-secondary)] hover:text-[var(--color-label-primary)] focus:bg-[var(--color-fill-secondary)] focus:text-[var(--color-label-primary)] focus-visible:ring-[var(--focus-ring-color)]/50 [&_svg:not([class*='text-'])]:text-[var(--color-label-tertiary)] flex flex-col gap-[var(--spacing-1)] rounded-[var(--radius-small)] p-[var(--spacing-2)] text-[var(--font-size-sm)] transition-all duration-[var(--duration-quick)] ease-[var(--ease-out-smooth)] outline-none focus-visible:outline-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    />
  )
}

function NavigationMenuIndicator({
  className,
  ...props
}: React.ComponentProps<typeof NavigationMenuPrimitive.Indicator>) {
  return (
    <NavigationMenuPrimitive.Indicator
      data-slot="navigation-menu-indicator"
      data-tokens="applied" className={cn(
        "data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:fade-in top-full z-[1] flex h-[var(--spacing-1_5)] items-end justify-center overflow-hidden",
        className
      )}
      {...props}
    >
      <div className="bg-border relative top-[60%] h-[var(--spacing-2)] w-[var(--spacing-2)] rotate-45 rounded-tl-[var(--radius-sm)] shadow-[var(--shadow-medium)]" />
    </NavigationMenuPrimitive.Indicator>
  )
}

export
{
  NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport
}
