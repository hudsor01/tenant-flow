import * as React from 'react'
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
import { cn } from '@/lib/utils'

const userData = {
  name: "TenantFlow User",
  email: "user@tenantflow.app",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=TenantFlow",
}

interface SiteHeaderProps extends React.ComponentProps<'header'> {}

export const SiteHeader = React.forwardRef<HTMLElement, SiteHeaderProps>(
  ({ className, ...props }, ref) => {
  return (
    <header ref={ref} className={cn("flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)", className)} {...props}>
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1 touch-manipulation min-h-[44px] min-w-[44px]" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        
        {/* Search Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground size-4" />
            <Input
              placeholder="Search TenantFlow..."
              className="pl-10 pr-4 py-2 w-full touch-manipulation min-h-[44px]"
            />
          </div>
        </div>

        {/* User Avatar */}
        <div className="ml-auto flex items-center gap-2">
          <NavUser user={userData} />
        </div>
      </div>
    </header>
  )
})
SiteHeader.displayName = 'SiteHeader'
