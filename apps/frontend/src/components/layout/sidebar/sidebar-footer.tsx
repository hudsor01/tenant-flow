"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  ChevronDown,
  User,
  LogOut,
  Settings,
  Bell,
  Shield,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useSidebar } from "./sidebar-provider"

// Enhanced Sidebar Footer with status indicators
export function SidebarFooter() {
  const { collapsed } = useSidebar()
  const [onlineStatus, _setOnlineStatus] = React.useState(true)
  const [hasUnreadNotifications, _setHasUnreadNotifications] = React.useState(true)

  if (collapsed) {
    return (
      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="relative"
            >
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/user.jpg" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-xs">
                    JD
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                <motion.div
                  animate={{
                    scale: onlineStatus ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: onlineStatus ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar ${
                    onlineStatus ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                {/* Notification Indicator */}
                {hasUnreadNotifications && (
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border border-sidebar"
                  />
                )}
              </Button>
            </motion.div>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src="/avatars/user.jpg" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    JD
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">John Doe</p>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      <Shield className="h-2.5 w-2.5 mr-1" />
                      Admin
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">john@example.com</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className={`h-2 w-2 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <span className="text-xs text-muted-foreground">
                      {onlineStatus ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer relative">
              <Bell className="mr-2 h-4 w-4" />
              Notifications
              {hasUnreadNotifications && (
                <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0 min-w-[1.25rem] h-5">
                  <Zap className="h-2.5 w-2.5" />
                </Badge>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }

  return (
    <div className="border-t border-sidebar-border p-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full"
          >
            <Button variant="ghost" className="w-full justify-start gap-2 h-auto p-2 relative group">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatars/user.jpg" />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    JD
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                <motion.div
                  animate={{
                    scale: onlineStatus ? [1, 1.2, 1] : 1,
                  }}
                  transition={{
                    duration: 2,
                    repeat: onlineStatus ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar ${
                    onlineStatus ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                />
                {/* Notification Indicator */}
                {hasUnreadNotifications && (
                  <motion.div
                    animate={{
                      scale: [1, 1.3, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border border-sidebar"
                  />
                )}
              </div>
              <div className="flex flex-col items-start text-left flex-1">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-sm font-medium">John Doe</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0 ml-auto">
                    <Shield className="h-2.5 w-2.5 mr-1" />
                    Admin
                  </Badge>
                </div>
                <span className="text-xs text-sidebar-foreground/60">Property Manager</span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className={`h-1.5 w-1.5 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-xs text-sidebar-foreground/40">
                    {onlineStatus ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
              <motion.div
                animate={{ 
                  y: [0, 2, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 group-hover:text-sidebar-foreground transition-colors" />
              </motion.div>
            </Button>
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="right" align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="/avatars/user.jpg" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                  JD
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">John Doe</p>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    <Shield className="h-2.5 w-2.5 mr-1" />
                    Admin
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">john@example.com</p>
                <div className="flex items-center gap-1 mt-1">
                  <div className={`h-2 w-2 rounded-full ${onlineStatus ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="text-xs text-muted-foreground">
                    {onlineStatus ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem className="cursor-pointer relative">
            <Bell className="mr-2 h-4 w-4" />
            Notifications
            {hasUnreadNotifications && (
              <Badge variant="destructive" className="ml-auto text-xs px-1.5 py-0 min-w-[1.25rem] h-5">
                <Zap className="h-2.5 w-2.5" />
              </Badge>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="cursor-pointer text-red-600 focus:text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}