'use client'

import { useDashboardStats } from '@/hooks/api/use-dashboard'
import { useProperties } from '@/hooks/api/use-properties'
import type { Property } from '@repo/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  Building2, 
  Users, 
  FileText, 
  Wrench,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Home,
  TrendingUp
} from 'lucide-react'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

// First-time user detection and progress tracking
function useOnboardingProgress() {
  const { data: stats } = useDashboardStats()
  const [dismissed, setDismissed] = useState(false)
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedKey = 'onboarding-dismissed'
      setDismissed(localStorage.getItem(dismissedKey) === 'true')
    }
  }, [])
  
  const steps = [
    { 
      id: 'property', 
      label: 'Add a property', 
      completed: (stats?.properties?.totalProperties || 0) > 0,
      href: '/properties/new',
      icon: Building2
    },
    { 
      id: 'tenant', 
      label: 'Add a tenant', 
      completed: (stats?.tenants?.totalTenants || 0) > 0,
      href: '/tenants/new',
      icon: Users
    },
    { 
      id: 'lease', 
      label: 'Create a lease', 
      completed: (stats?.leases?.activeLeases || 0) > 0,
      href: '/leases/new',
      icon: FileText
    }
  ]
  
  const completedSteps = steps.filter(s => s.completed).length
  const progress = (completedSteps / steps.length) * 100
  const isNewUser = completedSteps === 0
  const isPartiallyComplete = completedSteps > 0 && completedSteps < steps.length
  
  const dismissOnboarding = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding-dismissed', 'true')
      setDismissed(true)
    }
  }
  
  return {
    steps,
    progress,
    isNewUser,
    isPartiallyComplete,
    completedSteps,
    dismissed,
    dismissOnboarding
  }
}

// Enhanced onboarding banner for first-time users
export function OnboardingBanner() {
  const { steps, progress, isNewUser, isPartiallyComplete, completedSteps, dismissed, dismissOnboarding } = useOnboardingProgress()
  
  if (dismissed || (!isNewUser && !isPartiallyComplete)) {
    return null
  }
  
  return (
    <Card className="border-gradient-brand relative overflow-hidden">
      {/* Brand gradient background */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{ background: 'var(--gradient-brand-subtle)' }}
      />
      <CardHeader className="relative">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              {isNewUser ? (
                <>
                  <Sparkles className="h-5 w-5 text-primary" />
                  Welcome to TenantFlow!
                </>
              ) : (
                <>
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Great progress!
                </>
              )}
            </CardTitle>
            <CardDescription>
              {isNewUser 
                ? "Let's get you started with your property management journey"
                : `You're ${completedSteps}/3 of the way through setup`}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={dismissOnboarding}
            className="text-muted-foreground hover:text-foreground"
          >
            Dismiss
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 relative">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Setup Progress</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="grid gap-2 sm:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon
            return (
              <Link
                key={step.id}
                href={step.completed ? '#' : step.href}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg border p-3 transition-all",
                  step.completed 
                    ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20" 
                    : "border-border hover:border-primary/50 hover:bg-accent"
                )}
              >
                <div className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full",
                  step.completed
                    ? "bg-green-600 text-white"
                    : "bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-white"
                )}>
                  {step.completed ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={cn(
                    "text-sm font-medium leading-none",
                    step.completed && "line-through opacity-60"
                  )}>
                    {step.label}
                  </p>
                  {step.completed && (
                    <p className="text-xs text-green-600 dark:text-green-400">Completed</p>
                  )}
                </div>
                {!step.completed && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </Link>
            )
          })}
        </div>
        
        {isNewUser && (
          <Alert className="border-primary/50 bg-primary/5">
            <Sparkles className="h-4 w-4" />
            <AlertTitle>Pro tip</AlertTitle>
            <AlertDescription>
              Start by adding your first property, then add tenants and create leases to manage your rentals efficiently.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

// Main dashboard statistics component
export function DashboardStats() {
  const { data: stats, isLoading, error } = useDashboardStats()
  
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error loading dashboard</AlertTitle>
        <AlertDescription>
          There was a problem loading your dashboard data. Please try refreshing the page.
        </AlertDescription>
      </Alert>
    )
  }
  
  const statCards = [
    {
      title: 'Total Properties',
      value: stats?.properties?.totalProperties || 0,
      description: `${stats?.properties?.occupancyRate || 0}% occupied`,
      icon: Building2,
      href: '/properties',
      color: 'var(--steel-600)',
      bgGradient: 'linear-gradient(135deg, var(--steel-500) 0%, var(--steel-600) 100%)'
    },
    {
      title: 'Active Tenants',
      value: stats?.tenants?.totalTenants || 0,
      description: 'Current tenants',
      icon: Users,
      href: '/tenants',
      color: 'var(--teal-600)',
      bgGradient: 'linear-gradient(135deg, var(--teal-500) 0%, var(--teal-600) 100%)'
    },
    {
      title: 'Active Leases',
      value: stats?.leases?.activeLeases || 0,
      description: `${stats?.leases?.expiredLeases || 0} expired`,
      icon: FileText,
      href: '/leases',
      color: 'var(--steel-700)',
      bgGradient: 'linear-gradient(135deg, var(--steel-600) 0%, var(--steel-700) 100%)'
    },
    {
      title: 'Maintenance',
      value: stats?.maintenanceRequests?.open || 0,
      description: 'Open requests',
      icon: Wrench,
      href: '/maintenance',
      color: 'var(--warning-600)',
      bgGradient: 'linear-gradient(135deg, var(--warning-500) 0%, var(--warning-600) 100%)'
    }
  ]
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <Link key={stat.title} href={stat.href}>
            <Card className="transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer relative overflow-hidden group">
              {/* Subtle gradient background on hover */}
              <div 
                className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                style={{ background: stat.bgGradient }}
              />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center"
                  style={{
                    background: `${stat.color}15`,
                    color: stat.color
                  }}
                >
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-2xl font-bold text-gradient-brand">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

// Recent properties component
export function RecentProperties() {
  const { data: properties, isLoading } = useProperties({ limit: 5 })
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Properties</CardTitle>
          <CardDescription>Your recently added properties</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }
  
  if (!properties?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Properties</CardTitle>
          <CardDescription>Your recently added properties</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Home className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-sm text-muted-foreground mb-4">
              No properties added yet
            </p>
            <Link href="/properties/new">
              <Button size="sm">
                <Building2 className="h-4 w-4 mr-2" />
                Add First Property
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Properties</CardTitle>
            <CardDescription>Your recently added properties</CardDescription>
          </div>
          <Link href="/properties">
            <Button variant="ghost" size="sm">
              View all
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {properties.map((property: Property) => (
            <Link
              key={property.id}
              href={`/properties/${property.id}`}
              className="flex items-center gap-4 rounded-lg p-3 transition-colors hover:bg-accent"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium leading-none">
                  {property.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {property.address}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium">
                  {property.units?.length || 0} units
                </p>
                <Badge variant="secondary" className="text-xs">
                  {property.propertyType}
                </Badge>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Quick actions component
export function QuickActions() {
  const actions = [
    {
      label: 'Add Property',
      icon: Building2,
      href: '/properties/new',
      color: 'bg-blue-500',
      description: 'Register a new property'
    },
    {
      label: 'Add Tenant',
      icon: Users,
      href: '/tenants/new',
      color: 'bg-green-500',
      description: 'Add a new tenant'
    },
    {
      label: 'Create Lease',
      icon: FileText,
      href: '/leases/new',
      color: 'bg-purple-500',
      description: 'Create a new lease'
    },
    {
      label: 'New Request',
      icon: Wrench,
      href: '/maintenance/new',
      color: 'bg-orange-500',
      description: 'Submit maintenance request'
    }
  ]
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group flex items-center gap-3 rounded-lg border p-3 transition-all hover:border-primary/50 hover:bg-accent"
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg text-white transition-transform group-hover:scale-110",
                  action.color
                )}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{action.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {action.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}