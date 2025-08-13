'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  Home,
  Building,
  Plus,
  BarChart3,
  User,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { cn } from '@/lib/utils'

const navigationItems = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    shortName: 'Home'
  },
  {
    id: 'properties',
    name: 'Properties',
    href: '/properties',
    icon: Building,
    shortName: 'Props',
    badgeKey: 'properties.totalProperties'
  },
  {
    id: 'add',
    name: 'Add',
    href: '/properties/new',
    icon: Plus,
    shortName: 'Add',
    isFab: true
  },
  {
    id: 'reports',
    name: 'Reports',
    href: '/reports',
    icon: BarChart3,
    shortName: 'Reports'
  },
  {
    id: 'profile',
    name: 'Profile',
    href: '/profile',
    icon: User,
    shortName: 'Profile'
  }
]

interface MobileNavProps {
  className?: string
}

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname()
  const { data: stats } = useDashboardStats()

  const getBadgeValue = (badgeKey?: string) => {
    if (!badgeKey || !stats) return null
    
    const keys = badgeKey.split('.')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value = stats as any
    for (const key of keys) {
      value = value?.[key]
    }
    return typeof value === 'number' && value > 0 ? value : null
  }

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden",
        "safe-area-pb", // Add safe area padding for devices with home indicators
        className
      )}
    >
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (pathname.startsWith(item.href + '/') && !item.isFab)
          const badgeValue = getBadgeValue(item.badgeKey)

          if (item.isFab) {
            // Floating Action Button (Add)
            return (
              <Link
                key={item.id}
                href={item.href}
                className="relative"
              >
                <motion.div
                  className={cn(
                    "flex items-center justify-center w-14 h-14 rounded-full",
                    "bg-blue-600 text-white shadow-lg",
                    "transform transition-all duration-200 ease-out",
                    "hover:bg-blue-700 hover:scale-105 active:scale-95"
                  )}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  animate={{ y: isActive ? -2 : 0 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 300,
                    damping: 25
                  }}
                >
                  <Icon className="w-6 h-6" />
                </motion.div>

                {/* Ripple effect for FAB */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-full bg-blue-600 opacity-20"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1.2 }}
                    transition={{ 
                      duration: 0.6,
                      repeat: Infinity,
                      repeatType: "reverse"
                    }}
                  />
                )}
              </Link>
            )
          }

          // Regular navigation items
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center min-w-0 px-2 py-2",
                "text-xs font-medium transition-colors duration-200",
                "hover:bg-gray-50 rounded-lg",
                isActive 
                  ? "text-blue-600" 
                  : "text-gray-600 hover:text-gray-900"
              )}
            >
              <motion.div
                className="relative flex items-center justify-center"
                animate={{ 
                  y: isActive ? -1 : 0,
                  scale: isActive ? 1.1 : 1
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 300,
                  damping: 25
                }}
              >
                <Icon 
                  className={cn(
                    "w-5 h-5 mb-1 transition-colors duration-200",
                    isActive ? "text-blue-600" : "text-gray-500"
                  )} 
                />
                
                {/* Badge for item counts */}
                {badgeValue && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1"
                  >
                    <Badge 
                      variant="secondary" 
                      className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] h-[18px] flex items-center justify-center"
                    >
                      {badgeValue > 99 ? '99+' : badgeValue}
                    </Badge>
                  </motion.div>
                )}
              </motion.div>

              {/* Item label */}
              <span 
                className={cn(
                  "text-[10px] leading-none truncate max-w-full transition-colors duration-200",
                  isActive ? "text-blue-600 font-semibold" : "text-gray-500"
                )}
              >
                {item.shortName}
              </span>

              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute top-0 left-1/2 w-1 h-1 bg-blue-600 rounded-full"
                  initial={{ scale: 0, x: "-50%" }}
                  animate={{ scale: 1 }}
                  transition={{ 
                    type: "spring",
                    stiffness: 400,
                    damping: 25
                  }}
                  layoutId="mobile-nav-indicator"
                />
              )}
            </Link>
          )
        })}
      </div>

      {/* Background blur effect for better readability */}
      <div className="absolute inset-0 -z-10 bg-white/80 backdrop-blur-md border-t border-gray-200" />
    </nav>
  )
}

// Add styles for safe area support
export const mobileNavStyles = `
  .safe-area-pb {
    padding-bottom: env(safe-area-inset-bottom);
  }
  
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    .safe-area-pb {
      padding-bottom: calc(0.5rem + env(safe-area-inset-bottom));
    }
  }
`