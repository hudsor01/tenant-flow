/**
 * Sidebar Mobile - Client Component
 * 
 * Mobile-specific sidebar using Sheet component for overlay behavior.
 * Client component due to sheet state management.
 */

"use client"

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { SIDEBAR_WIDTH_MOBILE } from "./constants"

interface SidebarMobileProps extends React.ComponentProps<typeof Sheet> {
  side?: "left" | "right"
  className?: string
  children: React.ReactNode
}

export function SidebarMobile({
  open,
  onOpenChange,
  side = "left",
  className,
  children,
  ...props
}: SidebarMobileProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} {...props}>
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