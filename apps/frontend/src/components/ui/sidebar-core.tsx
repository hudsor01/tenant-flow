'use client'

/**
 * Sidebar Core Components - Client Components
 * 
 * Core sidebar structural components that require client-side behavior
 * Focused components with minimal JavaScript footprint
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { useSidebar } from "./sidebar-provider"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SIDEBAR_WIDTH_MOBILE } from "./sidebar/constants"

interface SidebarProps extends React.ComponentProps<"div"> {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
}

export function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  className,
  children,
  ...props
}: SidebarProps) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar()

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH_MOBILE,
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <div
      data-slot="sidebar"
      data-side={side}
      data-variant={variant}
      data-collapsible={state === "collapsed" ? collapsible : ""}
      className={cn(
        "bg-sidebar text-sidebar-foreground relative flex h-svh w-(--sidebar-width) flex-col",
        // Variants
        variant === "floating" &&
          "rounded-lg border border-sidebar-border bg-sidebar shadow-md",
        variant === "inset" &&
          "inset-y-2 inset-x-2 w-(--sidebar-width-inset) rounded-lg border border-sidebar-border",
        // Collapsible
        state === "collapsed" &&
          collapsible === "icon" &&
          "w-(--sidebar-width-icon)",
        // Side
        side === "right" && "ml-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar } = useSidebar()

  return (
    <button
      data-sidebar="trigger"
      className={cn("h-7 w-7", className)}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    />
  )
}