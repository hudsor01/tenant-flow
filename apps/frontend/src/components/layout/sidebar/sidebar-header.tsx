"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
  Building2, 
  X, 
  ChevronDown, 
  Check, 
  Plus,
  Settings,
  Users,
  Building,
  Crown,
  Sparkles
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useSidebar } from "./sidebar-provider"

interface Workspace {
  id: string
  name: string
  type: 'personal' | 'team' | 'enterprise'
  avatar?: string
  role: string
  propertyCount: number
  isActive: boolean
}

const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Personal Portfolio',
    type: 'personal',
    role: 'Owner',
    propertyCount: 12,
    isActive: true
  },
  {
    id: '2', 
    name: 'Sunrise Properties',
    type: 'team',
    role: 'Manager',
    propertyCount: 247,
    isActive: false
  },
  {
    id: '3',
    name: 'Metro Real Estate',
    type: 'enterprise', 
    role: 'Admin',
    propertyCount: 1284,
    isActive: false
  }
]

// Enhanced Sidebar Header with Workspace Switching
export function SidebarHeader() {
  const { collapsed, setCollapsed } = useSidebar()
  const [currentWorkspace, setCurrentWorkspace] = React.useState<Workspace>(
    mockWorkspaces.find(w => w.isActive) || mockWorkspaces[0]
  )

  const getWorkspaceIcon = (type: Workspace['type']) => {
    switch (type) {
      case 'personal':
        return <Users className="h-4 w-4" />
      case 'team':
        return <Building className="h-4 w-4" />
      case 'enterprise':
        return <Crown className="h-4 w-4" />
      default:
        return <Building2 className="h-4 w-4" />
    }
  }

  const getWorkspaceColor = (type: Workspace['type']) => {
    switch (type) {
      case 'personal':
        return 'bg-gradient-to-br from-primary to-primary/80'
      case 'team':
        return 'bg-gradient-to-br from-green-500 to-green-600'
      case 'enterprise':
        return 'bg-gradient-to-br from-purple-500 to-purple-600'
      default:
        return 'bg-gradient-to-br from-primary to-primary/80'
    }
  }

  if (collapsed) {
    return (
      <div className="flex h-14 items-center justify-center border-b border-sidebar-border px-2">
        <motion.div
          whileHover={{ 
            scale: 1.05,
            rotate: [0, -5, 5, 0],
            transition: { 
              duration: 0.6,
              ease: [0.25, 0.46, 0.45, 0.94],
              rotate: { 
                duration: 0.8,
                ease: "easeInOut"
              }
            }
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            boxShadow: [
              "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              "0 10px 15px -3px rgb(0 0 0 / 0.1)",
              "0 4px 6px -1px rgb(0 0 0 / 0.1)"
            ]
          }}
          transition={{
            boxShadow: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg text-primary-foreground cursor-pointer shadow-lg",
            getWorkspaceColor(currentWorkspace.type)
          )}
        >
          <motion.div
            animate={{ 
              rotate: [0, 360],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            {getWorkspaceIcon(currentWorkspace.type)}
          </motion.div>
        </motion.div>
        
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 lg:hidden"
          onClick={() => setCollapsed(!collapsed)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-14 items-center border-b border-sidebar-border px-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-10 w-full justify-start gap-2 px-2 hover:bg-sidebar-accent"
          >
            <motion.div
              whileHover={{ 
                scale: 1.1,
                rotate: [0, -3, 3, 0],
                transition: { 
                  duration: 0.4,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }
              }}
              whileTap={{ scale: 0.9 }}
              animate={{
                y: [0, -2, 0],
              }}
              transition={{
                y: {
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground shadow-md ring-1 ring-white/10",
                getWorkspaceColor(currentWorkspace.type)
              )}
            >
              <motion.div
                animate={{ 
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 12,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                {getWorkspaceIcon(currentWorkspace.type)}
              </motion.div>
            </motion.div>
            
            <div className="flex flex-1 flex-col items-start">
              <div className="flex items-center gap-1">
                <motion.span 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                  className="text-sm font-semibold truncate max-w-[120px]"
                >
                  {currentWorkspace.name}
                </motion.span>
                {currentWorkspace.type === 'enterprise' && (
                  <motion.div
                    animate={{ 
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                      scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    }}
                  >
                    <Sparkles className="h-3 w-3 text-purple-500" />
                  </motion.div>
                )}
              </div>
              <motion.span 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
                className="text-xs text-sidebar-foreground/60"
              >
                {currentWorkspace.propertyCount} properties
              </motion.span>
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
              <ChevronDown className="h-4 w-4 text-sidebar-foreground/60" />
            </motion.div>
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent 
          className="w-64" 
          align="start"
          side="bottom"
          sideOffset={4}
        >
          <DropdownMenuLabel>Switch Workspace</DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          {mockWorkspaces.map((workspace) => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => setCurrentWorkspace(workspace)}
              className="flex items-center gap-3 p-3 cursor-pointer"
            >
              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-primary-foreground",
                getWorkspaceColor(workspace.type)
              )}>
                {getWorkspaceIcon(workspace.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {workspace.name}
                  </p>
                  {workspace.isActive && (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                  {workspace.type === 'enterprise' && (
                    <Badge variant="secondary" className="text-xs px-1.5 py-0">
                      PRO
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{workspace.role}</span>
                  <span>•</span>
                  <span>{workspace.propertyCount} properties</span>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
            <Plus className="h-4 w-4" />
            <span>Create Workspace</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            <span>Workspace Settings</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Button
        variant="ghost"
        size="icon"
        className="ml-2 h-8 w-8 lg:hidden"
        onClick={() => setCollapsed(!collapsed)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}